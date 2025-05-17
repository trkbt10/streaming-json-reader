type ContextType = "object" | "array";
type ContextState = "expectKeyOrEnd" | "expectKey" | "expectColon" | "expectValue" | "expectValueOrEnd" | "expectCommaOrEnd";
declare class ParserContext {
    type: ContextType;
    value: any;
    key: string | undefined;
    state: ContextState;
    constructor(type: ContextType, value: any);
}
export declare class IncrementalParser {
    stack: ParserContext[];
    root: any;
    buffer: string;
    state: "default" | "string" | "number" | "literal";
    token: string;
    escape: boolean;
    updates: any[];
    feed(chunk: string): void;
    end(): any;
    _pushValue(value: any): void;
    _closeStructure(ch: string): void;
    _comma(): void;
    _colon(): void;
    _cloneRoot(): any;
    collectUpdates(): any[];
}
type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P] extends Array<infer U> ? Array<DeepPartial<U>> : T[P];
};
export declare function incrementalJsonParser<T extends any>(reader: ReadableStreamDefaultReader<Uint8Array | string>): AsyncGenerator<DeepPartial<T>, void, unknown>;
export {};
