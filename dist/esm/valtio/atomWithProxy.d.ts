export declare function atomWithProxy<Value extends object>(proxyObject: Value): import("jotai").WritableAtom<Value, Value | ((prev: Value) => Value)>;
