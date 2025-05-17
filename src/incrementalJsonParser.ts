// Incremental JSON parser that yields partial objects as they are parsed.
// The parser processes a reader compatible with `ReadableStreamDefaultReader`
// and returns an async generator yielding immutable snapshots of the parsed
// JSON structure.

const isWhitespace = (ch: string): boolean => {
  return ch === " " || ch === "\n" || ch === "\r" || ch === "\t";
};

const isDigit = (ch: string): boolean => {
  return ch >= "0" && ch <= "9";
};

const isNumberChar = (ch: string): boolean => {
  return (
    isDigit(ch) ||
    ch === "-" ||
    ch === "+" ||
    ch === "e" ||
    ch === "E" ||
    ch === "."
  );
};

type ContextType = "object" | "array";
type ContextState =
  | "expectKeyOrEnd"
  | "expectKey"
  | "expectColon"
  | "expectValue"
  | "expectValueOrEnd"
  | "expectCommaOrEnd";

class ParserContext {
  type: ContextType;
  value: any;
  key: string | undefined;
  state: ContextState;

  constructor(type: ContextType, value: any) {
    this.type = type;
    this.value = value;
    this.key = undefined;
    this.state = type === "object" ? "expectKeyOrEnd" : "expectValueOrEnd";
  }
}

export class IncrementalParser {
  stack: ParserContext[] = [];
  root: any = undefined;
  buffer = "";
  state: "default" | "string" | "number" | "literal" = "default";
  token = "";
  escape = false;
  updates: any[] = [];

  feed(chunk: string): void {
    this.buffer += chunk;
    let i = 0;
    while (i < this.buffer.length) {
      const ch = this.buffer[i];
      switch (this.state) {
        case "default":
          if (isWhitespace(ch)) {
            i++;
            break;
          }
          if (ch === "{") {
            const obj = {};
            this._pushValue(obj);
            this.stack.push(new ParserContext("object", obj));
            i++;
            break;
          }
          if (ch === "[") {
            const arr: any[] = [];
            this._pushValue(arr);
            this.stack.push(new ParserContext("array", arr));
            i++;
            break;
          }
          if (ch === "}" || ch === "]") {
            this._closeStructure(ch);
            i++;
            break;
          }
          if (ch === ",") {
            this._comma();
            i++;
            break;
          }
          if (ch === ":") {
            this._colon();
            i++;
            break;
          }
          if (ch === '"') {
            this.state = "string";
            this.token = "";
            i++;
            break;
          }
          if (ch === "-" || isDigit(ch)) {
            this.state = "number";
            this.token = ch;
            i++;
            break;
          }
          if (ch === "t" || ch === "f" || ch === "n") {
            this.state = "literal";
            this.token = ch;
            i++;
            break;
          }
          throw new Error("Unexpected token " + ch);
        case "string":
          if (this.escape) {
            this.token += ch;
            this.escape = false;
            i++;
            break;
          }
          if (ch === "\\") {
            this.escape = true;
            i++;
            break;
          }
          if (ch === '"') {
            const value = JSON.parse('"' + this.token + '"');
            this._pushValue(value);
            this.state = "default";
            this.token = "";
            i++;
            break;
          }
          this.token += ch;
          i++;
          break;
        case "number":
          if (isNumberChar(ch)) {
            this.token += ch;
            i++;
            break;
          }
          this._pushValue(Number(this.token));
          this.state = "default";
          this.token = "";
          // retry this character in default state
          continue;
        case "literal":
          this.token += ch;
          i++;
          if (this.token === "true") {
            this._pushValue(true);
            this.state = "default";
            this.token = "";
            break;
          }
          if (this.token === "false") {
            this._pushValue(false);
            this.state = "default";
            this.token = "";
            break;
          }
          if (this.token === "null") {
            this._pushValue(null);
            this.state = "default";
            this.token = "";
            break;
          }
          if (
            "true".startsWith(this.token) ||
            "false".startsWith(this.token) ||
            "null".startsWith(this.token)
          ) {
            break; // still pending
          }
          throw new Error("Unexpected token " + this.token);
      }
    }
    this.buffer = this.buffer.slice(i);
  }

  end(): any {
    if (
      this.state === "string" ||
      this.state === "number" ||
      this.state === "literal"
    ) {
      throw new Error("Unexpected end of JSON input");
    }
    if (this.stack.length !== 0) {
      throw new Error("Unexpected end of JSON input");
    }
    return this.root;
  }

  _pushValue(value: any): void {
    if (this.stack.length === 0) {
      this.root = value;
      this.updates.push(this._cloneRoot());
      return;
    }
    const ctx = this.stack[this.stack.length - 1];
    if (ctx.type === "array") {
      if (ctx.state !== "expectValue" && ctx.state !== "expectValueOrEnd") {
        throw new Error("Unexpected value in array");
      }
      ctx.value.push(value);
      ctx.state = "expectCommaOrEnd";
    } else {
      if (ctx.state === "expectKey" || ctx.state === "expectKeyOrEnd") {
        ctx.key = value;
        ctx.state = "expectColon";
        return;
      }
      if (ctx.state !== "expectValue") {
        throw new Error("Unexpected value in object");
      }
      if (ctx.key === undefined) {
        throw new Error("Object key is undefined");
      }
      ctx.value[ctx.key] = value;
      ctx.key = undefined;
      ctx.state = "expectCommaOrEnd";
    }
    this.updates.push(this._cloneRoot());
  }

  _closeStructure(ch: string): void {
    if (this.stack.length === 0) {
      throw new Error("Unexpected closing bracket");
    }
    const ctx = this.stack[this.stack.length - 1];
    if (ctx.type === "array" && ch === "]") {
      this.stack.pop();
      this.updates.push(this._cloneRoot());
      return;
    }
    if (ctx.type === "object" && ch === "}") {
      if (ctx.state === "expectColon" || ctx.state === "expectValue") {
        throw new Error("Unexpected closing brace");
      }
      this.stack.pop();
      this.updates.push(this._cloneRoot());
      return;
    }
    throw new Error("Mismatched closing bracket");
  }

  _comma(): void {
    if (this.stack.length === 0) {
      throw new Error("Unexpected comma");
    }
    const ctx = this.stack[this.stack.length - 1];
    if (ctx.state !== "expectCommaOrEnd") {
      throw new Error("Unexpected comma");
    }
    ctx.state = ctx.type === "object" ? "expectKey" : "expectValue";
  }

  _colon(): void {
    if (this.stack.length === 0) {
      throw new Error("Unexpected colon");
    }
    const ctx = this.stack[this.stack.length - 1];
    if (ctx.type !== "object" || ctx.state !== "expectColon") {
      throw new Error("Unexpected colon");
    }
    ctx.state = "expectValue";
  }

  _cloneRoot(): any {
    return this.root === undefined
      ? undefined
      : JSON.parse(JSON.stringify(this.root));
  }

  collectUpdates(): any[] {
    const list = this.updates;
    this.updates = [];
    return list;
  }
}
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object
    ? DeepPartial<T[P]>
    : T[P] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[P];
};
export async function* incrementalJsonParser<T extends any>(
  reader: ReadableStreamDefaultReader<Uint8Array | string>
): AsyncGenerator<DeepPartial<T>, void, unknown> {
  const decoder = new TextDecoder();
  const parser = new IncrementalParser();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      parser.end();
      const updates = parser.collectUpdates();
      for (const u of updates) {
        if (u !== undefined) {
          yield u;
        }
      }
      break;
    }
    const chunk = value instanceof Uint8Array ? decoder.decode(value) : value;
    parser.feed(chunk);
    const updates = parser.collectUpdates();
    for (const u of updates) {
      if (u !== undefined) {
        yield u;
      }
    }
  }
}
