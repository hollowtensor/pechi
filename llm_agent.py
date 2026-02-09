"""
LLM Agent — Maruti Suzuki Service Assistant
Connects to LM Studio (Qwen3-4B) with tool calling, rolling summary memory,
customer context caching, and Redis session persistence.
"""

import json
import logging
from datetime import datetime

import httpx
import redis.asyncio as aioredis

from database import execute_safe_query_structured, get_schema_description, build_job_card_data

log = logging.getLogger("llm_agent")

LM_STUDIO_URL = "http://localhost:1234/v1"
MODEL = "qwen/qwen3-4b-2507"
REDIS_URL = "redis://localhost:6379"
SESSION_TTL = 3600  # 1 hour

# Token budget (Qwen3-4B has 32K context)
TOKEN_BUDGET = 24000  # leave 8K for response + tool overhead
SUMMARIZE_THRESHOLD = 16000  # trigger summarization above this
RECENT_MESSAGES_KEEP = 8  # always keep last N messages in full
TOOL_RESULT_MAX_CHARS = 800  # truncate tool results in history

MAX_TOOL_ROUNDS = 5

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_database",
            "description": (
                "Search the Maruti Suzuki service center database using a SQL SELECT query. "
                "Use this to look up customer information, vehicle details, service history, "
                "parts pricing and availability, and service packages. "
                "Always use JOINs when you need data from multiple tables."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "sql_query": {
                        "type": "string",
                        "description": "A SQL SELECT query to execute against the database.",
                    }
                },
                "required": ["sql_query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_service_jobcard",
            "description": (
                "Create a service job card for the customer. This displays a visual card "
                "on the customer's screen with vehicle info, selected services, parts, "
                "and total cost. The customer can review, edit, and confirm the booking. "
                "Use this ONLY after you have identified the vehicle (need vehicle_id) and "
                "the customer has expressed intent to book a service."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "vehicle_id": {
                        "type": "integer",
                        "description": "The vehicle ID from the vehicles table.",
                    },
                    "service_package_id": {
                        "type": "integer",
                        "description": "Service package ID from service_packages table. Use search_database first to find the right one.",
                    },
                    "part_ids": {
                        "type": "array",
                        "items": {"type": "integer"},
                        "description": "List of part IDs from parts table for additional parts needed.",
                    },
                    "preferred_date": {
                        "type": "string",
                        "description": "Customer's preferred service date in YYYY-MM-DD format.",
                    },
                    "notes": {
                        "type": "string",
                        "description": "Any additional notes or customer requests.",
                    },
                },
                "required": ["vehicle_id"],
            },
        },
    },
]

BASE_SYSTEM_PROMPT = f"""You are a friendly and professional Maruti Suzuki service center assistant. Your name is Pechi.

Your role:
- Help customers check their vehicle service history
- Provide information about upcoming scheduled services
- Share parts pricing and availability
- Explain service packages and recommendations
- Answer questions about their vehicles
- Help customers book/schedule services

Guidelines:
- Be polite, concise, and helpful
- Use the search_database tool to look up information before answering
- If a customer mentions their name, phone number, or vehicle registration, use it to find their records
- When sharing costs, always mention the currency as INR (₹)
- If you cannot find information, say so clearly and suggest they visit the service center
- Never reveal raw SQL queries, database structure, or internal technical details to the customer
- Keep responses conversational and brief — this is a voice assistant
- If the customer asks something unrelated to car service, politely redirect them
- You DO have conversation memory within a session. If a conversation summary or prior messages are provided below, use them. Never say you cannot remember previous messages — you can.

Service booking flow:
- When a customer wants to book a service, first identify their vehicle (registration number or name lookup)
- Ask their preferred date if not mentioned
- Recommend an appropriate service package using search_database (query service_packages table)
- Once you have the vehicle_id, package, and date, you MUST call the create_service_jobcard tool. NEVER describe a job card in text — ALWAYS use the tool.
- After calling the tool, tell the customer: "I've sent a service job card to your screen. Please review the details and click Confirm to finalize the booking."
- Booking is ONLY completed when the customer clicks the Confirm button on the job card displayed on their screen. Do NOT treat verbal confirmation ("yes", "confirm", etc.) as a completed booking.
- If the customer says "confirm" verbally, remind them to use the Confirm button on the card on their screen.
- NEVER say a booking is confirmed unless you receive explicit confirmation that the job card was saved (you will see this in the conversation context).

{get_schema_description()}"""


def _classify_panel_data(columns: list[str], rows: list[dict]) -> dict | None:
    """Classify a DB query result into a side panel message, or None if not displayable."""
    if not rows:
        return None

    cols = {c.lower() for c in columns}

    # Service history: has service_date + service_type
    if "service_date" in cols and "service_type" in cols:
        r0 = rows[0]
        label = ""
        if "model" in cols and "registration_no" in cols:
            label = f"{r0.get('model', '')} ({r0.get('registration_no', '')})"
        elif "registration_no" in cols:
            label = str(r0.get("registration_no", ""))
        return {
            "type": "side_panel",
            "panelType": "service_history",
            "title": f"Service History ({len(rows)} records)",
            "data": {
                "vehicleLabel": label,
                "records": [
                    {
                        "date": str(r.get("service_date", "")),
                        "type": str(r.get("service_type", "")),
                        "description": str(r.get("description", "")),
                        "cost": float(r.get("cost", 0) or 0),
                        "status": str(r.get("status", "")),
                        "partsReplaced": json.loads(r["parts_replaced"]) if r.get("parts_replaced") else [],
                        "nextServiceDate": str(r["next_service_date"]) if r.get("next_service_date") else None,
                        "notes": str(r["notes"]) if r.get("notes") else None,
                    }
                    for r in rows
                ],
            },
        }

    # Vehicle info: has registration_no + model + customer name
    if "registration_no" in cols and "model" in cols:
        # Check for customer name column (could be "name" or "customer_name")
        name_col = next((c for c in columns if "name" in c.lower()), None)
        phone_col = next((c for c in columns if "phone" in c.lower()), None)
        r0 = rows[0]
        return {
            "type": "side_panel",
            "panelType": "vehicle_info",
            "title": f"{r0.get('model', '')} ({r0.get('registration_no', '')})",
            "data": {
                "customer": {
                    "name": str(r0.get(name_col, "")) if name_col else "",
                    "phone": str(r0.get(phone_col, "")) if phone_col else "",
                },
                "vehicle": {
                    "model": str(r0.get("model", "")),
                    "variant": str(r0.get("variant", "")),
                    "fuelType": str(r0.get("fuel_type", "")),
                    "year": int(r0.get("year", 0) or 0),
                    "registrationNo": str(r0.get("registration_no", "")),
                    "color": str(r0.get("color", "")),
                    "mileage": int(r0.get("current_mileage", 0) or 0),
                },
            },
        }

    # Parts: has part_number
    if "part_number" in cols:
        return {
            "type": "side_panel",
            "panelType": "parts_list",
            "title": f"Parts ({len(rows)} found)",
            "data": {
                "parts": [
                    {
                        "name": str(r.get("name", "")),
                        "partNumber": str(r.get("part_number", "")),
                        "category": str(r.get("category", "")),
                        "price": float(r.get("price", 0) or 0),
                        "compatibleModels": str(r.get("compatible_models", "")),
                        "inStock": bool(r.get("in_stock", 1)),
                    }
                    for r in rows
                ],
            },
        }

    # Service packages: has includes + applicable_models or validity_months
    if "includes" in cols and ("applicable_models" in cols or "validity_months" in cols):
        return {
            "type": "side_panel",
            "panelType": "service_packages",
            "title": f"Service Packages ({len(rows)})",
            "data": {
                "packages": [
                    {
                        "id": int(r.get("id", 0) or 0),
                        "name": str(r.get("name", "")),
                        "description": str(r.get("description", "")),
                        "price": float(r.get("price", 0) or 0),
                        "validityMonths": int(r.get("validity_months", 0) or 0),
                        "includes": json.loads(r["includes"]) if r.get("includes") else [],
                    }
                    for r in rows
                ],
            },
        }

    return None


def estimate_tokens(messages: list[dict]) -> int:
    """Rough token estimate: ~4 chars per token for mixed English/JSON."""
    return len(json.dumps(messages, default=str)) // 4


def _truncate_tool_result(content: str) -> str:
    """Truncate large tool results for history storage."""
    if len(content) <= TOOL_RESULT_MAX_CHARS:
        return content
    return content[:TOOL_RESULT_MAX_CHARS] + "\n...(truncated)"


class LLMAgent:
    """Per-session LLM agent with rolling summary, customer context, and Redis persistence."""

    def __init__(self, user_id: str, send_data_callback=None):
        self.user_id = user_id
        self.send_data_callback = send_data_callback
        self.history: list[dict] = []
        self.summary: str = ""
        self.customer_context: str = ""
        self.http = httpx.AsyncClient(
            base_url=LM_STUDIO_URL,
            timeout=httpx.Timeout(60.0, connect=10.0),
        )
        self._redis: aioredis.Redis | None = None

    # ------------------------------------------------------------------
    # Redis persistence
    # ------------------------------------------------------------------

    async def _get_redis(self) -> aioredis.Redis:
        if self._redis is None:
            self._redis = aioredis.from_url(REDIS_URL, decode_responses=True)
        return self._redis

    async def load_from_redis(self) -> bool:
        """Restore session state from Redis. Returns True if session found."""
        try:
            r = await self._get_redis()
            data = await r.get(f"pechi:session:{self.user_id}")
            if data:
                state = json.loads(data)
                self.summary = state.get("summary", "")
                self.customer_context = state.get("customer_context", "")
                self.history = state.get("history", [])
                log.info(f"Restored session for {self.user_id[:8]}: {len(self.history)} messages, summary={bool(self.summary)}")
                return True
        except Exception as e:
            log.warning(f"Redis load failed: {e}")
        return False

    async def save_to_redis(self):
        """Persist session state to Redis."""
        try:
            r = await self._get_redis()
            state = {
                "summary": self.summary,
                "customer_context": self.customer_context,
                "history": self.history,
            }
            await r.set(
                f"pechi:session:{self.user_id}",
                json.dumps(state, default=str),
                ex=SESSION_TTL,
            )
        except Exception as e:
            log.warning(f"Redis save failed: {e}")

    # ------------------------------------------------------------------
    # Context building
    # ------------------------------------------------------------------

    def _build_system_prompt(self) -> str:
        """Build system prompt with optional customer context and summary."""
        now = datetime.now()
        time_str = now.strftime("%I:%M %p, %A, %B %d, %Y")
        parts = [BASE_SYSTEM_PROMPT, f"\nCurrent date and time: {time_str}"]

        if self.customer_context:
            parts.append(f"\nIdentified customer:\n{self.customer_context}")

        if self.summary:
            parts.append(f"\nConversation summary so far:\n{self.summary}")

        return "\n".join(parts)

    def _build_messages(self) -> list[dict]:
        """Build the message list sent to LLM: system + recent history."""
        return [
            {"role": "system", "content": self._build_system_prompt()},
            *self.history,
        ]

    # ------------------------------------------------------------------
    # Summarization
    # ------------------------------------------------------------------

    async def _maybe_summarize(self):
        """If context is getting large, summarize older messages."""
        messages = self._build_messages()
        tokens = estimate_tokens(messages)

        if tokens < SUMMARIZE_THRESHOLD:
            return

        log.info(f"Context at ~{tokens} tokens, summarizing...")

        # Split: keep last RECENT_MESSAGES_KEEP, summarize the rest
        if len(self.history) <= RECENT_MESSAGES_KEEP:
            return  # nothing to summarize

        old_messages = self.history[:-RECENT_MESSAGES_KEEP]
        recent_messages = self.history[-RECENT_MESSAGES_KEEP:]

        # Build summarization prompt
        summary_input = []
        if self.summary:
            summary_input.append(f"Previous summary: {self.summary}")
        for msg in old_messages:
            role = msg.get("role", "unknown")
            content = msg.get("content", "")
            if role == "tool":
                content = _truncate_tool_result(content)
            if content:
                summary_input.append(f"{role}: {content[:300]}")

        summary_text = "\n".join(summary_input)

        try:
            resp = await self.http.post(
                "/chat/completions",
                json={
                    "model": MODEL,
                    "messages": [
                        {
                            "role": "system",
                            "content": "Summarize the following conversation between a customer and a Maruti service assistant. Focus on: who the customer is, what vehicles they have, what they asked about, what information was provided. Be concise (3-5 sentences max).",
                        },
                        {"role": "user", "content": summary_text},
                    ],
                    "temperature": 0.3,
                    "max_tokens": 300,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            self.summary = data["choices"][0]["message"]["content"].strip()
            self.history = recent_messages
            log.info(f"Summarized. New context: ~{estimate_tokens(self._build_messages())} tokens")
        except Exception as e:
            log.error(f"Summarization failed: {e}")
            # Fallback: just trim
            self.history = recent_messages

    # ------------------------------------------------------------------
    # Customer context extraction
    # ------------------------------------------------------------------

    def _try_extract_customer_context(self, tool_result: str):
        """Try to extract customer identity from a DB query result."""
        if self.customer_context:
            return  # already have it

        # Look for customer-like data in tool results
        if "name" not in tool_result.lower() or "registration_no" not in tool_result.lower():
            return

        # Just cache the first few lines of a result that has customer+vehicle info
        lines = tool_result.strip().split("\n")
        if len(lines) >= 3:  # header + separator + at least one row
            context_lines = lines[:min(6, len(lines))]  # cap at 5 data rows
            self.customer_context = "\n".join(context_lines)
            log.info(f"Extracted customer context: {self.customer_context[:100]}...")

    # ------------------------------------------------------------------
    # Chat
    # ------------------------------------------------------------------

    async def chat(self, user_text: str) -> str:
        """Process user message, call tools if needed, return assistant response."""
        self.history.append({"role": "user", "content": user_text})

        for _ in range(MAX_TOOL_ROUNDS):
            try:
                resp = await self.http.post(
                    "/chat/completions",
                    json={
                        "model": MODEL,
                        "messages": self._build_messages(),
                        "tools": TOOLS,
                        "tool_choice": "auto",
                        "temperature": 0.7,
                        "max_tokens": 1024,
                    },
                )
                resp.raise_for_status()
                data = resp.json()
            except httpx.HTTPError as e:
                log.error(f"LM Studio request failed: {e}")
                return "I'm sorry, I'm having trouble processing your request right now. Please try again."
            except Exception as e:
                log.error(f"LLM error: {e}")
                return "Something went wrong. Please try again."

            choice = data["choices"][0]
            message = choice["message"]

            tool_calls = message.get("tool_calls")
            if tool_calls:
                self.history.append(message)

                for tool_call in tool_calls:
                    func = tool_call["function"]
                    tool_name = func["name"]
                    tool_id = tool_call.get("id", "call_0")

                    if tool_name == "search_database":
                        try:
                            args = json.loads(func["arguments"])
                            sql = args.get("sql_query", "")
                            log.info(f"Tool call: search_database({sql[:100]}...)")
                            result = execute_safe_query_structured(sql)
                            full_result = result["text"]
                            log.info(f"Query result: {full_result[:200]}...")

                            # Try to extract customer context from results
                            self._try_extract_customer_context(full_result)

                            # Send structured data to frontend as side panel
                            if result["rows"] and self.send_data_callback:
                                panel_msg = _classify_panel_data(result["columns"], result["rows"])
                                if panel_msg:
                                    log.info(f"Side panel: {panel_msg['panelType']} — {panel_msg['title']}")
                                    await self.send_data_callback(panel_msg)
                        except (json.JSONDecodeError, KeyError) as e:
                            log.error(f"Tool call parse error: {e}")
                            full_result = "Error: Could not parse the query."

                    elif tool_name == "create_service_jobcard":
                        try:
                            args = json.loads(func["arguments"])
                            log.info(f"Tool call: create_service_jobcard({args})")
                            card = build_job_card_data(
                                vehicle_id=args["vehicle_id"],
                                service_package_id=args.get("service_package_id"),
                                part_ids=args.get("part_ids"),
                                preferred_date=args.get("preferred_date", ""),
                                notes=args.get("notes", ""),
                            )
                            if "error" in card:
                                full_result = f"Error: {card['error']}"
                            else:
                                # Send job card to frontend as side panel
                                if self.send_data_callback:
                                    await self.send_data_callback({
                                        "type": "side_panel",
                                        "panelType": "job_card",
                                        "title": "Service Job Card",
                                        "isActionable": True,
                                        "data": card,
                                    })
                                full_result = (
                                    f"Job card displayed on customer's screen for {card['vehicle']['model']} "
                                    f"({card['vehicle']['registrationNo']}). "
                                    f"Total estimate: ₹{card['totalEstimate']:,.0f}. "
                                    f"IMPORTANT: Tell the customer to review and click the Confirm button on their screen. "
                                    f"Do NOT confirm the booking yourself — only the on-screen button finalizes it."
                                )
                                log.info(f"Job card sent: ₹{card['totalEstimate']:,.0f}")
                        except Exception as e:
                            log.error(f"Job card error: {e}", exc_info=True)
                            full_result = f"Error creating job card: {e}"

                    else:
                        full_result = f"Error: Unknown tool '{tool_name}'"

                    # Store full result for this turn, will be compressed later
                    self.history.append({
                        "role": "tool",
                        "tool_call_id": tool_id,
                        "content": full_result,
                    })

                continue

            # Final text response
            assistant_text = message.get("content", "").strip()
            if not assistant_text:
                assistant_text = "I couldn't generate a response. Could you rephrase your question?"

            self.history.append({"role": "assistant", "content": assistant_text})

            # Post-turn: compress old tool results in history
            self._compress_old_tool_results()

            # Post-turn: summarize if needed
            await self._maybe_summarize()

            # Post-turn: persist to Redis
            await self.save_to_redis()

            tokens = estimate_tokens(self._build_messages())
            log.info(f"Context: ~{tokens} tokens, history: {len(self.history)} messages, summary: {bool(self.summary)}")

            return assistant_text

        log.warning("Max tool rounds reached")
        return "I've looked up the information but couldn't finalize a response. Could you ask your question differently?"

    def _compress_old_tool_results(self):
        """Truncate tool results from older turns (keep last 4 messages full)."""
        if len(self.history) <= 4:
            return
        for i in range(len(self.history) - 4):
            msg = self.history[i]
            if msg.get("role") == "tool" and len(msg.get("content", "")) > TOOL_RESULT_MAX_CHARS:
                self.history[i] = {
                    **msg,
                    "content": _truncate_tool_result(msg["content"]),
                }

    def reset(self):
        """Clear conversation history."""
        self.history = []
        self.summary = ""
        self.customer_context = ""

    async def close(self):
        """Close HTTP and Redis clients."""
        await self.http.aclose()
        if self._redis:
            await self._redis.aclose()
