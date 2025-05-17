const l = (i) => i === " " || i === `
` || i === "\r" || i === "	", h = (i) => i >= "0" && i <= "9", p = (i) => h(i) || i === "-" || i === "+" || i === "e" || i === "E" || i === ".";
class n {
  constructor(s, t) {
    this.type = s, this.value = t, this.key = void 0, this.state = s === "object" ? "expectKeyOrEnd" : "expectValueOrEnd";
  }
}
class f {
  constructor() {
    this.stack = [], this.root = void 0, this.buffer = "", this.state = "default", this.token = "", this.escape = !1, this.updates = [];
  }
  feed(s) {
    this.buffer += s;
    let t = 0;
    for (; t < this.buffer.length; ) {
      const e = this.buffer[t];
      switch (this.state) {
        case "default":
          if (l(e)) {
            t++;
            break;
          }
          if (e === "{") {
            const r = {};
            this._pushValue(r), this.stack.push(new n("object", r)), t++;
            break;
          }
          if (e === "[") {
            const r = [];
            this._pushValue(r), this.stack.push(new n("array", r)), t++;
            break;
          }
          if (e === "}" || e === "]") {
            this._closeStructure(e), t++;
            break;
          }
          if (e === ",") {
            this._comma(), t++;
            break;
          }
          if (e === ":") {
            this._colon(), t++;
            break;
          }
          if (e === '"') {
            this.state = "string", this.token = "", t++;
            break;
          }
          if (e === "-" || h(e)) {
            this.state = "number", this.token = e, t++;
            break;
          }
          if (e === "t" || e === "f" || e === "n") {
            this.state = "literal", this.token = e, t++;
            break;
          }
          throw new Error("Unexpected token " + e);
        case "string":
          if (this.escape) {
            this.token += e, this.escape = !1, t++;
            break;
          }
          if (e === "\\") {
            this.escape = !0, t++;
            break;
          }
          if (e === '"') {
            const r = JSON.parse('"' + this.token + '"');
            this._pushValue(r), this.state = "default", this.token = "", t++;
            break;
          }
          this.token += e, t++;
          break;
        case "number":
          if (p(e)) {
            this.token += e, t++;
            break;
          }
          this._pushValue(Number(this.token)), this.state = "default", this.token = "";
          continue;
        case "literal":
          if (this.token += e, t++, this.token === "true") {
            this._pushValue(!0), this.state = "default", this.token = "";
            break;
          }
          if (this.token === "false") {
            this._pushValue(!1), this.state = "default", this.token = "";
            break;
          }
          if (this.token === "null") {
            this._pushValue(null), this.state = "default", this.token = "";
            break;
          }
          if ("true".startsWith(this.token) || "false".startsWith(this.token) || "null".startsWith(this.token))
            break;
          throw new Error("Unexpected token " + this.token);
      }
    }
    this.buffer = this.buffer.slice(t);
  }
  end() {
    if (this.state === "string" || this.state === "number" || this.state === "literal")
      throw new Error("Unexpected end of JSON input");
    if (this.stack.length !== 0)
      throw new Error("Unexpected end of JSON input");
    return this.root;
  }
  _pushValue(s) {
    if (this.stack.length === 0) {
      this.root = s, this.updates.push(this._cloneRoot());
      return;
    }
    const t = this.stack[this.stack.length - 1];
    if (t.type === "array") {
      if (t.state !== "expectValue" && t.state !== "expectValueOrEnd")
        throw new Error("Unexpected value in array");
      t.value.push(s), t.state = "expectCommaOrEnd";
    } else {
      if (t.state === "expectKey" || t.state === "expectKeyOrEnd") {
        t.key = s, t.state = "expectColon";
        return;
      }
      if (t.state !== "expectValue")
        throw new Error("Unexpected value in object");
      if (t.key === void 0)
        throw new Error("Object key is undefined");
      t.value[t.key] = s, t.key = void 0, t.state = "expectCommaOrEnd";
    }
    this.updates.push(this._cloneRoot());
  }
  _closeStructure(s) {
    if (this.stack.length === 0)
      throw new Error("Unexpected closing bracket");
    const t = this.stack[this.stack.length - 1];
    if (t.type === "array" && s === "]") {
      this.stack.pop(), this.updates.push(this._cloneRoot());
      return;
    }
    if (t.type === "object" && s === "}") {
      if (t.state === "expectColon" || t.state === "expectValue")
        throw new Error("Unexpected closing brace");
      this.stack.pop(), this.updates.push(this._cloneRoot());
      return;
    }
    throw new Error("Mismatched closing bracket");
  }
  _comma() {
    if (this.stack.length === 0)
      throw new Error("Unexpected comma");
    const s = this.stack[this.stack.length - 1];
    if (s.state !== "expectCommaOrEnd")
      throw new Error("Unexpected comma");
    s.state = s.type === "object" ? "expectKey" : "expectValue";
  }
  _colon() {
    if (this.stack.length === 0)
      throw new Error("Unexpected colon");
    const s = this.stack[this.stack.length - 1];
    if (s.type !== "object" || s.state !== "expectColon")
      throw new Error("Unexpected colon");
    s.state = "expectValue";
  }
  _cloneRoot() {
    return this.root === void 0 ? void 0 : JSON.parse(JSON.stringify(this.root));
  }
  collectUpdates() {
    const s = this.updates;
    return this.updates = [], s;
  }
}
async function* k(i) {
  const s = new TextDecoder(), t = new f();
  for (; ; ) {
    const { done: e, value: r } = await i.read();
    if (e) {
      t.end();
      const o = t.collectUpdates();
      for (const a of o)
        a !== void 0 && (yield a);
      break;
    }
    const c = r instanceof Uint8Array ? s.decode(r) : r;
    t.feed(c);
    const u = t.collectUpdates();
    for (const o of u)
      o !== void 0 && (yield o);
  }
}
export {
  f as IncrementalParser,
  k as incrementalJsonParser
};
