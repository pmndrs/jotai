import { InfiniteData, InfiniteQueryObserverOptions, QueryKey, RefetchOptions, RefetchQueryFilters } from 'react-query';
import { WritableAtom } from 'jotai';
import { CreateQueryOptions, GetQueryClient } from './types';
export declare type AtomWithInfiniteQueryAction<TQueryFnData> = ({
    type: 'refetch';
} & Partial<RefetchOptions & RefetchQueryFilters<TQueryFnData>>) | {
    type: 'fetchNextPage';
} | {
    type: 'fetchPreviousPage';
};
export declare type AtomWithInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryData> = InfiniteQueryObserverOptions<TQueryFnData, TError, TData, TQueryData> & {
    queryKey: QueryKey;
};
export declare type AtomWithInfiniteQueryOptionsWithEnabled<TQueryFnData, TError, TData, TQueryData> = Pick<AtomWithInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryData>, Exclude<keyof AtomWithInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryData>, 'enabled'>> & {
    enabled: boolean;
};
export declare function atomWithInfiniteQuery<TQueryFnData, TError, TData = TQueryFnData, TQueryData = TQueryFnData>(createQuery: CreateQueryOptions<AtomWithInfiniteQueryOptionsWithEnabled<TQueryFnData, TError, TData, TQueryData>>, getQueryClient?: GetQueryClient): WritableAtom<InfiniteData<TData | TQueryData> | undefined, AtomWithInfiniteQueryAction<TQueryFnData>>;
export declare function atomWithInfiniteQuery<TQueryFnData, TError, TData = TQueryFnData, TQueryData = TQueryFnData>(createQuery: CreateQueryOptions<AtomWithInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryData>>, getQueryClient?: GetQueryClient): WritableAtom<InfiniteData<TData | TQueryData>, AtomWithInfiniteQueryAction<TQueryFnData>>;
