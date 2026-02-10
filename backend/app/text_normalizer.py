"""
Text normalizer for ASR output.
Converts spoken numbers to digits, normalizes registration plates,
phone numbers, and other patterns before passing to the LLM.
"""

import re

# Word -> digit mapping
WORD_TO_DIGIT = {
    "zero": "0", "oh": "0", "o": "0",
    "one": "1", "two": "2", "three": "3", "four": "4", "five": "5",
    "six": "6", "seven": "7", "eight": "8", "nine": "9",
    "ten": "10", "eleven": "11", "twelve": "12", "thirteen": "13",
    "fourteen": "14", "fifteen": "15", "sixteen": "16", "seventeen": "17",
    "eighteen": "18", "nineteen": "19", "twenty": "20",
    "thirty": "30", "forty": "40", "fifty": "50",
    "sixty": "60", "seventy": "70", "eighty": "80", "ninety": "90",
}

# "double five" -> "55", "triple seven" -> "777"
REPEAT_PREFIXES = {"double": 2, "triple": 3}


def _strip_punct(word: str) -> tuple[str, str]:
    """Strip trailing punctuation from a word, return (clean_word, trailing_punct)."""
    trailing = ""
    while word and word[-1] in ".,;:!?":
        trailing = word[-1] + trailing
        word = word[:-1]
    return word, trailing


def _convert_number_word(word: str) -> str | None:
    """Convert a single number word to its digit string, or None if not a number."""
    clean, _ = _strip_punct(word)
    return WORD_TO_DIGIT.get(clean.lower())


def _is_digit_str(word: str) -> bool:
    """Check if a word (after stripping punctuation) is purely digits."""
    clean, _ = _strip_punct(word)
    return clean.isdigit() and len(clean) > 0


def normalize_spoken_numbers(text: str) -> str:
    """Convert spoken number words to digits in text.

    Handles:
        "MH twelve A B one two three four" -> "MH 12 A B 1234"
        "nine eight seven six five four three two one zero" -> "9876543210"
        "double five" -> "55"
        "twenty three" -> "23"
        "0123 four" -> "01234"  (mixed digit/word sequences)
        "four." -> "4"  (punctuation-attached number words)
    """
    words = text.split()
    result = []
    i = 0

    while i < len(words):
        clean_word, trailing = _strip_punct(words[i])
        word_lower = clean_word.lower()

        # Handle "double X" / "triple X"
        if word_lower in REPEAT_PREFIXES and i + 1 < len(words):
            next_clean, next_trail = _strip_punct(words[i + 1])
            next_digit = WORD_TO_DIGIT.get(next_clean.lower())
            if next_digit and len(next_digit) == 1:
                result.append(next_digit * REPEAT_PREFIXES[word_lower] + next_trail)
                i += 2
                continue

        # Handle tens + ones: "twenty three" -> "23", "fifty six" -> "56"
        digit = WORD_TO_DIGIT.get(word_lower)
        if digit and int(digit) >= 20 and int(digit) % 10 == 0:
            if i + 1 < len(words):
                next_clean, next_trail = _strip_punct(words[i + 1])
                next_digit = WORD_TO_DIGIT.get(next_clean.lower())
                if next_digit and 1 <= int(next_digit) <= 9:
                    result.append(str(int(digit) + int(next_digit)) + next_trail)
                    i += 2
                    continue
            result.append(digit + trailing)
            i += 1
            continue

        # Handle single number words OR digit strings -- collect consecutive and join
        # This handles "one two three four" -> "1234" AND "0123 four" -> "01234"
        is_number_word = digit is not None and len(digit) <= 2
        is_digit = clean_word.isdigit()

        if is_number_word or is_digit:
            # Start collecting: current value
            if is_digit:
                digits = [clean_word]
            else:
                digits = [digit]

            j = i + 1
            last_trailing = trailing
            while j < len(words):
                nclean, ntrail = _strip_punct(words[j])
                nd = WORD_TO_DIGIT.get(nclean.lower())

                # Accept single-digit number words
                if nd and len(nd) == 1:
                    digits.append(nd)
                    last_trailing = ntrail
                    j += 1
                # Accept digit strings (e.g., "0123")
                elif nclean.isdigit():
                    digits.append(nclean)
                    last_trailing = ntrail
                    j += 1
                # Accept tens+ones as compound (e.g., "twenty" followed by "three")
                elif nd and int(nd) >= 20 and int(nd) % 10 == 0 and j + 1 < len(words):
                    nn_clean, nn_trail = _strip_punct(words[j + 1])
                    nn_d = WORD_TO_DIGIT.get(nn_clean.lower())
                    if nn_d and 1 <= int(nn_d) <= 9:
                        digits.append(str(int(nd) + int(nn_d)))
                        last_trailing = nn_trail
                        j += 2
                    else:
                        digits.append(nd)
                        last_trailing = ntrail
                        j += 1
                else:
                    break

            result.append("".join(digits) + last_trailing)
            i = j
            continue

        # Not a number word -- keep as-is
        result.append(words[i])
        i += 1

    return " ".join(result)


def _collapse_spaced_letters(text: str) -> str:
    """Collapse single spaced letters into groups: 'A B' -> 'AB', 'M H' -> 'MH'."""
    def _join_letters(m):
        return m.group(0).replace(" ", "")
    # Match sequences of single letters: "M H" or "A B C"
    return re.sub(r'\b([A-Z])\s+([A-Z])\s+([A-Z])\b', _join_letters,
           re.sub(r'\b([A-Z])\s+([A-Z])\b', _join_letters, text))


def _merge_adjacent_digits(text: str) -> str:
    """Merge adjacent digit groups separated by spaces: '0123 4' -> '01234'."""
    return re.sub(r'(\d)\s+(\d)', r'\1\2', text)


def normalize_registration(text: str) -> str:
    """Try to detect and format Indian vehicle registration patterns.

    Patterns like "MH 12 AB 1234" or "MH12AB1234" get normalized.
    """
    # First collapse spaced letters: "M H" -> "MH", "A B" -> "AB"
    text = _collapse_spaced_letters(text)

    # Merge adjacent digit groups so "0123 4" -> "01234"
    # Only do this within potential registration contexts (near letters)
    # Use a targeted merge: digits near uppercase letter groups
    text = re.sub(
        r'([A-Z]{1,3})\s*(\d[\d\s]{0,8}\d)',
        lambda m: m.group(1) + _merge_adjacent_digits(m.group(2)),
        text,
    )

    # Match patterns like: MH 12 AB 1234, MH12AB1234, MH-12-AB-1234
    # Allow 1-5 digits in last group (trim to 4 if needed)
    pattern = r'\b([A-Z]{2})\s*[-]?\s*(\d{1,2})\s*[-]?\s*([A-Z]{1,3})\s*[-]?\s*(\d{1,5})\b'
    def _format_reg(m):
        last_digits = m.group(4)[-4:]  # take last 4 digits if more
        return f"{m.group(1)}-{m.group(2).zfill(2)}-{m.group(3)}-{last_digits.zfill(4)}"
    return re.sub(pattern, _format_reg, text, flags=re.IGNORECASE)


def normalize_phone(text: str) -> str:
    """Join separated digit groups that look like phone numbers (10 digits)."""
    # Find sequences of digit groups that total 10 digits
    pattern = r'\b(\d{1,5})\s+(\d{1,5})\s+(\d{1,5})\b'
    def _join_if_phone(m):
        combined = m.group(1) + m.group(2) + m.group(3)
        if len(combined) == 10:
            return combined
        return m.group(0)
    text = re.sub(pattern, _join_if_phone, text)

    # Also handle two-part: "98765 43210"
    pattern2 = r'\b(\d{4,5})\s+(\d{4,6})\b'
    def _join_if_phone2(m):
        combined = m.group(1) + m.group(2)
        if len(combined) == 10:
            return combined
        return m.group(0)
    return re.sub(pattern2, _join_if_phone2, text)


def normalize_asr_text(text: str) -> str:
    """Full normalization pipeline for ASR output."""
    text = normalize_spoken_numbers(text)
    text = normalize_registration(text)
    text = normalize_phone(text)
    return text
