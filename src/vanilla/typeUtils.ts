import type { Atom, PrimitiveAtom, WritableAtom } from './atom.ts'

export type Getter = Parameters<Atom<unknown>['read']>[0]
export type Setter = Parameters<
  WritableAtom<unknown, unknown[], unknown>['write']
>[1]

export type ExtractAtomValue<AtomType> =
  AtomType extends Atom<infer Value> ? Value : never

export type ExtractAtomArgs<AtomType> =
  AtomType extends WritableAtom<unknown, infer Args, infer _Result>
    ? Args
    : never

export type ExtractAtomResult<AtomType> =
  AtomType extends WritableAtom<unknown, infer _Args, infer Result>
    ? Result
    : never

export type SetStateAction<Value> = ExtractAtomArgs<PrimitiveAtom<Value>>[0]

type WithInitialValue<Value> = {
  init: Value
}

type Write<Args extends unknown[], Result> = WritableAtom<
  unknown,
  Args,
  Result
>['write']

export type AtomFactory<ReadOptions extends Record<string, unknown> | never> = {
  <Value, Args extends unknown[], Result>(
    read: (get: Getter, options: ReadOptions) => Value,
    write: Write<Args, Result>,
  ): WritableAtom<Value, Args, Result>
  <Value>(read: (get: Getter, options: ReadOptions) => Value): Atom<Value>
  <Value, Args extends unknown[], Result>(
    initialValue: Value,
    write: Write<Args, Result>,
  ): WritableAtom<Value, Args, Result> & WithInitialValue<Value>
  <Value>(): PrimitiveAtom<Value | undefined> &
    WithInitialValue<Value | undefined>
  <Value>(initialValue: Value): PrimitiveAtom<Value> & WithInitialValue<Value>
}

export type JoinOptions<
  Opts extends Record<string, unknown> | never,
  Extra extends Record<string, unknown>,
> = [Opts] extends [never] ? Extra : Opts & Extra
