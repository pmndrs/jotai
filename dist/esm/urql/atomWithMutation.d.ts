import type { Client, OperationContext, OperationResult, TypedDocumentNode } from '@urql/core';
import type { Getter } from 'jotai';
declare type MutationAction<Data, Variables extends object> = {
    variables?: Variables;
    context?: Partial<OperationContext>;
    callback?: (result: OperationResult<Data, Variables>) => void;
};
export declare function atomWithMutation<Data, Variables extends object>(createQuery: (get: Getter) => TypedDocumentNode<Data, Variables> | string, getClient?: (get: Getter) => Client): import("jotai").WritableAtom<OperationResult<Data, Variables>, MutationAction<Data, Variables>>;
export {};
