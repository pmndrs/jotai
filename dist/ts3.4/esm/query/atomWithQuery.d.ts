import { QueryKey, QueryObserverOptions } from 'react-query';
import { WritableAtom } from 'jotai';
import { CreateQueryOptions, GetQueryClient } from './types';
export declare type AtomWithQueryAction = {
    type: 'refetch';
};
export declare type AtomWithQueryOptions<TQueryFnData, TError, TData, TQueryData> = QueryObserverOptions<TQueryFnData, TError, TData, TQueryData> & {
    queryKey: QueryKey;
};
export declare type AtomWithQueryOptionsWithEnabled<TQueryFnData, TError, TData, TQueryData> = Pick<AtomWithQueryOptions<TQueryFnData, TError, TData, TQueryData>, Exclude<keyof AtomWithQueryOptions<TQueryFnData, TError, TData, TQueryData>, 'enabled'>> & {
    enabled: boolean;
};
export declare function atomWithQuery<TQueryFnData, TError, TData = TQueryFnData, TQueryData = TQueryFnData>(createQuery: CreateQueryOptions<AtomWithQueryOptionsWithEnabled<TQueryFnData, TError, TData, TQueryData>>, getQueryClient?: GetQueryClient): WritableAtom<TData | TQueryData | undefined, AtomWithQueryAction>;
export declare function atomWithQuery<TQueryFnData, TError, TData = TQueryFnData, TQueryData = TQueryFnData>(createQuery: CreateQueryOptions<AtomWithQueryOptions<TQueryFnData, TError, TData, TQueryData>>, getQueryClient?: GetQueryClient): WritableAtom<TData | TQueryData, AtomWithQueryAction>;
