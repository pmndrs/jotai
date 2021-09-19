declare type Getter = {
    <Value>(atom: Atom<Value | Promise<Value>>): Value;
    <Value>(atom: Atom<Promise<Value>>): Value;
    <Value>(atom: Atom<Value>): Value;
};
declare type WriteGetter = Getter & {
    <Value>(atom: Atom<Value | Promise<Value>>, unstable_promise: true): Value | Promise<Value>;
    <Value>(atom: Atom<Promise<Value>>, unstable_promise: true): Value | Promise<Value>;
    <Value>(atom: Atom<Value>, unstable_promise: true): Value | Promise<Value>;
};
declare type Setter = {
    <Value>(atom: WritableAtom<Value, undefined>): void | Promise<void>;
    <Value, Update>(atom: WritableAtom<Value, Update>, update: Update): void | Promise<void>;
};
declare type Read<Value> = (get: Getter) => Value | Promise<Value>;
declare type Write<Update> = (get: WriteGetter, set: Setter, update: Update) => void | Promise<void>;
declare type WithInitialValue<Value> = {
    init: Value;
};
export declare type Scope = symbol | string | number;
export declare type SetAtom<Update> = undefined extends Update ? (update?: Update) => void | Promise<void> : (update: Update) => void | Promise<void>;
declare type OnUnmount = () => void;
declare type OnMount<Update> = <S extends SetAtom<Update>>(setAtom: S) => OnUnmount | void;
export declare type Atom<Value> = {
    toString: () => string;
    debugLabel?: string;
    /**
     * @deprecated Instead use `useAtom(atom, scope)`
     */
    scope?: Scope;
    read: Read<Value>;
};
export declare type WritableAtom<Value, Update> = Atom<Value> & {
    write: Write<Update>;
    onMount?: OnMount<Update>;
};
declare type SetStateAction<Value> = Value | ((prev: Value) => Value);
export declare type PrimitiveAtom<Value> = WritableAtom<Value, SetStateAction<Value>>;
export declare function atom<Value, Update>(read: Read<Value>, write: Write<Update>): WritableAtom<Value, Update>;
export declare function atom<Value, Update>(initialValue: Value, write: Write<Update>): [Value] extends [Function] ? never : WritableAtom<Value, Update> & WithInitialValue<Value>;
export declare function atom<Value>(read: Read<Value>): Atom<Value>;
export declare function atom<Value extends unknown>(initialValue: Value): [Value] extends [Function] ? never : PrimitiveAtom<Value> & WithInitialValue<Value>;
export {};
