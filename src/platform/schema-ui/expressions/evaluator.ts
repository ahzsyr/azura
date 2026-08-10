import { parseExpression, type ExpressionAst } from "./parser";

export type ExpressionContext = Record<string, unknown>;

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function evalAst(ast: ExpressionAst, ctx: ExpressionContext): unknown {
  switch (ast.type) {
    case "literal":
      return ast.value;
    case "identifier":
      return ctx[ast.name];
    case "binary": {
      const left = evalAst(ast.left, ctx);
      const right = evalAst(ast.right, ctx);
      switch (ast.op) {
        case "+":
          return toNumber(left) + toNumber(right);
        case "-":
          return toNumber(left) - toNumber(right);
        case "*":
          return toNumber(left) * toNumber(right);
        case "/":
          return toNumber(right) === 0 ? 0 : toNumber(left) / toNumber(right);
        case "%":
          return toNumber(left) % toNumber(right);
        case "==":
          return left == right;
        case "!=":
          return left != right;
        case "<":
          return toNumber(left) < toNumber(right);
        case ">":
          return toNumber(left) > toNumber(right);
        case "<=":
          return toNumber(left) <= toNumber(right);
        case ">=":
          return toNumber(left) >= toNumber(right);
        case "&&":
          return Boolean(left) && Boolean(right);
        case "||":
          return Boolean(left) || Boolean(right);
        default:
          return null;
      }
    }
    case "call":
      return evalFunction(ast.name, ast.args, ctx);
    default:
      return null;
  }
}

function evalFunction(name: string, args: ExpressionAst[], ctx: ExpressionContext): unknown {
  const values = args.map((a) => evalAst(a, ctx));
  switch (name.toUpperCase()) {
    case "IF":
      return values[0] ? values[1] : values[2];
    case "AND":
      return values.every(Boolean);
    case "OR":
      return values.some(Boolean);
    case "NOT":
      return !values[0];
    case "CONCAT":
      return values.map(String).join("");
    case "UPPER":
      return String(values[0] ?? "").toUpperCase();
    case "LOWER":
      return String(values[0] ?? "").toLowerCase();
    case "CONTAINS":
      return String(values[0] ?? "").includes(String(values[1] ?? ""));
    case "LENGTH":
      return String(values[0] ?? "").length;
    case "ADD":
      return toNumber(values[0]) + toNumber(values[1]);
    case "SUB":
      return toNumber(values[0]) - toNumber(values[1]);
    case "MUL":
      return toNumber(values[0]) * toNumber(values[1]);
    case "DIV":
      return toNumber(values[1]) === 0 ? 0 : toNumber(values[0]) / toNumber(values[1]);
    case "ROUND":
      return Math.round(toNumber(values[0]));
    case "TODAY":
      return new Date().toISOString().slice(0, 10);
    case "AGE": {
      const birth = new Date(String(values[0] ?? ""));
      if (Number.isNaN(birth.getTime())) return 0;
      const diff = Date.now() - birth.getTime();
      return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
    }
    case "LOOKUP": {
      const table = values[0] as Record<string, unknown> | undefined;
      const key = String(values[1] ?? "");
      return table?.[key] ?? null;
    }
    default:
      return null;
  }
}

export class ExpressionEngine {
  evaluate(expression: string, context: ExpressionContext): unknown {
    if (!expression.trim()) return null;
    try {
      const ast = parseExpression(expression);
      return evalAst(ast, context);
    } catch {
      return null;
    }
  }

  validate(expression: string): { valid: boolean; error?: string } {
    try {
      parseExpression(expression);
      return { valid: true };
    } catch (err) {
      return { valid: false, error: err instanceof Error ? err.message : "Invalid expression" };
    }
  }
}

export const expressionEngine = new ExpressionEngine();
