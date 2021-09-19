import type { Action, AnyAction, Store } from 'redux';
export declare function atomWithStore<State, A extends Action = AnyAction>(store: Store<State, A>): import("jotai").WritableAtom<State, A>;
