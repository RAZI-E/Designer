export function repairJson<T = any>(raw: string): T {
  let cleaned = raw.trim();

  // Strip markdown code fences if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  // 1. First attempt: standard JSON.parse
  try {
    return JSON.parse(cleaned);
  } catch (err: any) {
    // Continue to repair strategies
  }

  let text = cleaned;

  // Strategy 1: Unterminated string detection
  // If terminated mid-string, find if there is an unclosed quote
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
    }
  }

  if (inString) {
    text += '"';
  }

  // Strategy 2: Balance unclosed braces and brackets
  const stack: string[] = [];
  let inStr = false;
  let esc = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (esc) {
      esc = false;
      continue;
    }
    if (ch === '\\') {
      esc = true;
      continue;
    }
    if (ch === '"') {
      inStr = !inStr;
      continue;
    }
    if (!inStr) {
      if (ch === '{' || ch === '[') {
        stack.push(ch);
      } else if (ch === '}') {
        if (stack.length && stack[stack.length - 1] === '{') stack.pop();
      } else if (ch === ']') {
        if (stack.length && stack[stack.length - 1] === '[') stack.pop();
      }
    }
  }

  while (stack.length > 0) {
    const last = stack.pop();
    if (last === '{') text += '}';
    else if (last === '[') text += ']';
  }

  try {
    return JSON.parse(text);
  } catch {
    // Strategy 3: Truncate back to the last clean delimiter and close
    // Useful when a key or value is half-typed, e.g. {"foo": "bar", "inco...
    const lastSafeComma = text.lastIndexOf(',');
    if (lastSafeComma > 0) {
      let truncated = text.substring(0, lastSafeComma);
      const subStack: string[] = [];
      let subInStr = false;
      let subEsc = false;

      for (let i = 0; i < truncated.length; i++) {
        const ch = truncated[i];
        if (subEsc) {
          subEsc = false;
          continue;
        }
        if (ch === '\\') {
          subEsc = true;
          continue;
        }
        if (ch === '"') {
          subInStr = !subInStr;
          continue;
        }
        if (!subInStr) {
          if (ch === '{' || ch === '[') subStack.push(ch);
          else if (ch === '}' && subStack[subStack.length - 1] === '{') subStack.pop();
          else if (ch === ']' && subStack[subStack.length - 1] === '[') subStack.pop();
        }
      }

      if (subInStr) truncated += '"';
      while (subStack.length > 0) {
        const last = subStack.pop();
        if (last === '{') truncated += '}';
        else if (last === '[') truncated += ']';
      }

      try {
        return JSON.parse(truncated);
      } catch {
        // Fallback to error below
      }
    }

    throw new Error(`Failed to parse AI output into valid JSON. Length: ${raw.length}`);
  }
}
