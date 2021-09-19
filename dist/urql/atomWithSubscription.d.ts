import type { Client, OperationContext, OperationResult, TypedDocumentNode } from '@urql/core';
import type { Atom, Getter } from 'jotai';
declare type OperationResultWithData<Data, Variables> = OperationResult<Data, Variables> & {
    data: Data;
};
declare type SubscriptionArgs<Data, Variables extends object> = {
    query: TypedDocumentNode<Data, Variables> | string;
    variables?: Variables;
    context?: Partial<OperationContext>;
};
declare type SubscriptionArgsWithPause<Data, Variables extends object> = SubscriptionArgs<Data, Variables> & {
    pause: boolean;
};
export declare function atomWithSubscription<Data, Variables extends object>(createSubscriptionArgs: (get: Getter) => SubscriptionArgs<Data, Variables>, getClient?: (get: Getter) => Client): Atom<OperationResultWithData<Data, Variables>>;
export declare function atomWithSubscription<Data, Variables extends object>(createSubscriptionArgs: (get: Getter) => SubscriptionArgsWithPause<Data, Variables>, getClient?: (get: Getter) => Client): Atom<OperationResultWithData<Data, Variables> | null>;
export {};
