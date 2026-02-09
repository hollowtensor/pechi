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

from database import execute_safe_query, get_schema_description

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
    }
]

BASE_SYSTEM_PROMPT = f"""You are a friendly and professional Maruti Suzuki service center assistant. Your name is Pechi.

Your role:
- Help customers check their vehicle service history
- Provide information about upcoming scheduled services
- Share parts pricing and availability
- Explain service packages and recommendations
- Answer questions about their vehicles

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

{get_schema_description()}"""


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

    def __init__(self, user_id: str):
        self.user_id = user_id
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
                            full_result = execute_safe_query(sql)
                            log.info(f"Query result: {full_result[:200]}...")

                            # Try to extract customer context from results
                            self._try_extract_customer_context(full_result)
                        except (json.JSONDecodeError, KeyError) as e:
                            log.error(f"Tool call parse error: {e}")
                            full_result = "Error: Could not parse the query."
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
