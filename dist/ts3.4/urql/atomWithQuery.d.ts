import { Client, OperationContext, OperationResult, RequestPolicy, TypedDocumentNode } from '@urql/core';
import { Getter, WritableAtom } from 'jotai';
declare type AtomWithQueryAction = {
    type: 'reexecute';
    opts?: Partial<OperationContext>;
};
declare type OperationResultWithData<Data, Variables> = OperationResult<Data, Variables> & {
    data: Data;
};
declare type QueryArgs<Data, Variables extends object> = {
    query: TypedDocumentNode<Data, Variables> | string;
    variables?: Variables;
    requestPolicy?: RequestPolicy;
    context?: Partial<OperationContext>;
};
declare type QueryArgsWithPause<Data, Variables extends object> = QueryArgs<Data, Variables> & {
    pause: boolean;
};
export declare function atomWithQuery<Data, Variables extends object>(createQueryArgs: (get: Getter) => QueryArgs<Data, Variables>, getClient?: (get: Getter) => Client): WritableAtom<OperationResultWithData<Data, Variables>, AtomWithQueryAction>;
export declare function atomWithQuery<Data, Variables extends object>(createQueryArgs: (get: Getter) => QueryArgsWithPause<Data, Variables>, getClient?: (get: Getter) => Client): WritableAtom<OperationResultWithData<Data, Variables> | null, AtomWithQueryAction>;
export {};
