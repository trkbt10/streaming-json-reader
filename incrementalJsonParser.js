// Incremental JSON parser that yields partial objects as they are parsed
// The parser processes a ReadableStreamDefaultReader and returns an async
// generator which yields immutable snapshots of the parsed JSON object.

function isWhitespace(ch) {
  return ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t';
}

function isDigit(ch) {
  return ch >= '0' && ch <= '9';
}

function isNumberChar(ch) {
  return isDigit(ch) || ch === '-' || ch === '+' || ch === 'e' || ch === 'E' || ch === '.';
}

class ParserContext {
  constructor(type, value) {
    this.type = type; // 'object' or 'array'
    this.value = value;
    this.key = undefined; // for objects
    this.state = type === 'object' ? 'expectKeyOrEnd' : 'expectValueOrEnd';
  }
}

class IncrementalParser {
  constructor() {
    this.stack = [];
    this.root = undefined;
    this.buffer = '';
    this.state = 'default';
    this.token = '';
    this.escape = false;
    this.updates = [];
  }

  feed(chunk) {
    this.buffer += chunk;
    let i = 0;
    while (i < this.buffer.length) {
      const ch = this.buffer[i];
      switch (this.state) {
        case 'default':
          if (isWhitespace(ch)) {
            i++;
            break;
          }
          if (ch === '{') {
            const obj = {};
            this._pushValue(obj);
            this.stack.push(new ParserContext('object', obj));
            i++;
            break;
          }
          if (ch === '[') {
            const arr = [];
            this._pushValue(arr);
            this.stack.push(new ParserContext('array', arr));
            i++;
            break;
          }
          if (ch === '}' || ch === ']') {
            this._closeStructure(ch);
            i++;
            break;
          }
          if (ch === ',') {
            this._comma();
            i++;
            break;
          }
          if (ch === ':') {
            this._colon();
            i++;
            break;
          }
          if (ch === '"') {
            this.state = 'string';
            this.token = '';
            i++;
            break;
          }
          if (ch === '-' || isDigit(ch)) {
            this.state = 'number';
            this.token = ch;
            i++;
            break;
          }
          if (ch === 't' || ch === 'f' || ch === 'n') {
            this.state = 'literal';
            this.token = ch;
            i++;
            break;
          }
          throw new Error('Unexpected token ' + ch);
        case 'string':
          if (this.escape) {
            this.token += ch;
            this.escape = false;
            i++;
            break;
          }
          if (ch === '\\') {
            this.escape = true;
            i++;
            break;
          }
          if (ch === '"') {
            const value = JSON.parse('"' + this.token + '"');
            this._pushValue(value);
            this.state = 'default';
            this.token = '';
            i++;
            break;
          }
          this.token += ch;
          i++;
          break;
        case 'number':
          if (isNumberChar(ch)) {
            this.token += ch;
            i++;
            break;
          }
          this._pushValue(Number(this.token));
          this.state = 'default';
          this.token = '';
          // retry this character in default state
          continue;
        case 'literal':
          this.token += ch;
          i++;
          if (this.token === 'true') {
            this._pushValue(true);
            this.state = 'default';
            this.token = '';
            break;
          }
          if (this.token === 'false') {
            this._pushValue(false);
            this.state = 'default';
            this.token = '';
            break;
          }
          if (this.token === 'null') {
            this._pushValue(null);
            this.state = 'default';
            this.token = '';
            break;
          }
          if ('true'.startsWith(this.token) ||
              'false'.startsWith(this.token) ||
              'null'.startsWith(this.token)) {
            break; // still pending
          }
          throw new Error('Unexpected token ' + this.token);
      }
    }
    this.buffer = this.buffer.slice(i);
  }

  end() {
    if (this.state === 'string' || this.state === 'number' || this.state === 'literal') {
      throw new Error('Unexpected end of JSON input');
    }
    if (this.stack.length !== 0) {
      throw new Error('Unexpected end of JSON input');
    }
    return this.root;
  }

  _pushValue(value) {
    if (this.stack.length === 0) {
      this.root = value;
      this.updates.push(this._cloneRoot());
      return;
    }
    const ctx = this.stack[this.stack.length - 1];
    if (ctx.type === 'array') {
      if (ctx.state !== 'expectValue' && ctx.state !== 'expectValueOrEnd') {
        throw new Error('Unexpected value in array');
      }
      ctx.value.push(value);
      ctx.state = 'expectCommaOrEnd';
    } else {
      if (ctx.state === 'expectKey' || ctx.state === 'expectKeyOrEnd') {
        ctx.key = value;
        ctx.state = 'expectColon';
        return;
      }
      if (ctx.state !== 'expectValue') {
        throw new Error('Unexpected value in object');
      }
      ctx.value[ctx.key] = value;
      ctx.key = undefined;
      ctx.state = 'expectCommaOrEnd';
    }
    this.updates.push(this._cloneRoot());
  }

  _closeStructure(ch) {
    if (this.stack.length === 0) {
      throw new Error('Unexpected closing bracket');
    }
    const ctx = this.stack[this.stack.length - 1];
    if (ctx.type === 'array' && ch === ']') {
      this.stack.pop();
      this.updates.push(this._cloneRoot());
      return;
    }
    if (ctx.type === 'object' && ch === '}') {
      if (ctx.state === 'expectColon' || ctx.state === 'expectValue') {
        throw new Error('Unexpected closing brace');
      }
      this.stack.pop();
      this.updates.push(this._cloneRoot());
      return;
    }
    throw new Error('Mismatched closing bracket');
  }

  _comma() {
    if (this.stack.length === 0) {
      throw new Error('Unexpected comma');
    }
    const ctx = this.stack[this.stack.length - 1];
    if (ctx.state !== 'expectCommaOrEnd') {
      throw new Error('Unexpected comma');
    }
    ctx.state = ctx.type === 'object' ? 'expectKey' : 'expectValue';
  }

  _colon() {
    if (this.stack.length === 0) {
      throw new Error('Unexpected colon');
    }
    const ctx = this.stack[this.stack.length - 1];
    if (ctx.type !== 'object' || ctx.state !== 'expectColon') {
      throw new Error('Unexpected colon');
    }
    ctx.state = 'expectValue';
  }

  _cloneRoot() {
    return this.root === undefined ? undefined : JSON.parse(JSON.stringify(this.root));
  }

  collectUpdates() {
    const list = this.updates;
    this.updates = [];
    return list;
  }
}

export async function* incrementalJsonParser(reader) {
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
    parser.feed(decoder.decode(value, { stream: true }));
    const updates = parser.collectUpdates();
    for (const u of updates) {
      if (u !== undefined) {
        yield u;
      }
    }
  }
}

