type Token =
  | { type: "string"; value: string }
  | { type: "number"; value: number }
  | { type: "boolean"; value: boolean }
  | { type: "identifier"; value: string }
  | { type: "operator"; value: string }
  | { type: "paren"; value: "(" | ")" }
  | { type: "comma" };

export function tokenizeExpression(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (ch === "(" || ch === ")") {
      tokens.push({ type: "paren", value: ch });
      i += 1;
      continue;
    }
    if (ch === ",") {
      tokens.push({ type: "comma" });
      i += 1;
      continue;
    }
    if ("=!<>".includes(ch)) {
      let op = ch;
      if (input[i + 1] === "=") {
        op += "=";
        i += 2;
      } else {
        i += 1;
      }
      tokens.push({ type: "operator", value: op });
      continue;
    }
    if (/[+\-*/%]/.test(ch)) {
      tokens.push({ type: "operator", value: ch });
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i += 1;
      let value = "";
      while (i < input.length && input[i] !== quote) {
        value += input[i];
        i += 1;
      }
      i += 1;
      tokens.push({ type: "string", value });
      continue;
    }
    if (/[0-9]/.test(ch)) {
      let num = ch;
      i += 1;
      while (i < input.length && /[0-9.]/.test(input[i])) {
        num += input[i];
        i += 1;
      }
      tokens.push({ type: "number", value: Number(num) });
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let id = ch;
      i += 1;
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
        id += input[i];
        i += 1;
      }
      if (id === "true" || id === "false") {
        tokens.push({ type: "boolean", value: id === "true" });
      } else {
        tokens.push({ type: "identifier", value: id });
      }
      continue;
    }
    i += 1;
  }
  return tokens;
}

export type ExpressionAst =
  | { type: "literal"; value: string | number | boolean }
  | { type: "identifier"; name: string }
  | { type: "binary"; op: string; left: ExpressionAst; right: ExpressionAst }
  | { type: "call"; name: string; args: ExpressionAst[] };

export function parseExpression(input: string): ExpressionAst {
  const tokens = tokenizeExpression(input);
  let pos = 0;

  const peek = (): Token | undefined => tokens[pos];
  const consume = (): Token => tokens[pos++];

  const parsePrimary = (): ExpressionAst => {
    const token = peek();
    if (!token) throw new Error("Unexpected end of expression");
    if (token.type === "paren" && token.value === "(") {
      consume();
      const expr = parseBinary(0);
      const close = peek();
      if (close?.type === "paren" && close.value === ")") consume();
      return expr;
    }
    if (token.type === "string" || token.type === "number" || token.type === "boolean") {
      consume();
      return { type: "literal", value: token.value };
    }
    if (token.type === "identifier") {
      const name = token.value;
      consume();
      const next = peek();
      if (next?.type === "paren" && next.value === "(") {
        consume();
        const args: ExpressionAst[] = [];
        const closing = peek();
        if (!(closing?.type === "paren" && closing.value === ")")) {
          args.push(parseBinary(0));
          while (peek()?.type === "comma") {
            consume();
            args.push(parseBinary(0));
          }
        }
        const closeCall = peek();
        if (closeCall?.type === "paren" && closeCall.value === ")") consume();
        return { type: "call", name, args };
      }
      return { type: "identifier", name };
    }
    throw new Error(`Unexpected token in expression: ${JSON.stringify(token)}`);
  };

  const precedence: Record<string, number> = {
    "||": 1,
    "&&": 2,
    "==": 3,
    "!=": 3,
    "<": 4,
    ">": 4,
    "<=": 4,
    ">=": 4,
    "+": 5,
    "-": 5,
    "*": 6,
    "/": 6,
    "%": 6,
  };

  const parseBinary = (minPrec: number): ExpressionAst => {
    let left = parsePrimary();
    while (true) {
      const token = peek();
      if (token?.type !== "operator") break;
      const op = token.value;
      const prec = precedence[op] ?? 0;
      if (prec < minPrec) break;
      consume();
      const right = parseBinary(prec + 1);
      left = { type: "binary", op, left, right };
    }
    return left;
  };

  const ast = parseBinary(0);
  return ast;
}

export function extractExpressionDependencies(input: string): string[] {
  try {
    const ast = parseExpression(input);
    const deps = new Set<string>();
    const walk = (node: ExpressionAst) => {
      if (node.type === "identifier") deps.add(node.name);
      else if (node.type === "binary") {
        walk(node.left);
        walk(node.right);
      } else if (node.type === "call") node.args.forEach(walk);
    };
    walk(ast);
    return [...deps];
  } catch {
    return [];
  }
}
