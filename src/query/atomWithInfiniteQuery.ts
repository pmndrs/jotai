import type {
  InfiniteData,
  InfiniteQueryObserverOptions,
  QueryKey,
  RefetchOptions,
  RefetchQueryFilters,
} from '@tanstack/query-core'
import { atomsWithInfiniteQuery } from 'jotai-tanstack-query'
import { atom } from 'jotai'
import type { Getter, WritableAtom } from 'jotai'
import { queryClientAtom } from './queryClientAtom'
import { CreateQueryOptions, GetQueryClient } from './types'

type AtomWithInfiniteQueryAction<TQueryFnData> =
  | {
      type: 'refetch'
      payload: Partial<RefetchOptions & RefetchQueryFilters<TQueryFnData>>
    }
  | { type: 'fetchNextPage' }
  | { type: 'fetchPreviousPage' }

export interface AtomWithInfiniteQueryOptions<
  TQueryFnData,
  TError,
  TData,
  TQueryData,
  TQueryKey extends QueryKey
> extends InfiniteQueryObserverOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryData,
    TQueryKey
  > {
  queryKey: TQueryKey
}

export interface AtomWithInfiniteQueryOptionsWithEnabled<
  TQueryFnData,
  TError,
  TData,
  TQueryData,
  TQueryKey extends QueryKey
> extends Omit<
    AtomWithInfiniteQueryOptions<
      TQueryFnData,
      TError,
      TData,
      TQueryData,
      TQueryKey
    >,
    'enabled'
  > {
  enabled: boolean
}

export function atomWithInfiniteQuery<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
>(
  createQuery: CreateQueryOptions<
    AtomWithInfiniteQueryOptionsWithEnabled<
      TQueryFnData,
      TError,
      TData,
      TQueryData,
      TQueryKey
    >
  >,
  getQueryClient?: GetQueryClient
): WritableAtom<
  InfiniteData<TData> | undefined,
  AtomWithInfiniteQueryAction<TQueryFnData>
>

export function atomWithInfiniteQuery<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
>(
  createQuery: CreateQueryOptions<
    AtomWithInfiniteQueryOptions<
      TQueryFnData,
      TError,
      TData,
      TQueryData,
      TQueryKey
    >
  >,
  getQueryClient?: GetQueryClient
): WritableAtom<InfiniteData<TData>, AtomWithInfiniteQueryAction<TQueryFnData>>

export function atomWithInfiniteQuery<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
>(
  createQuery: CreateQueryOptions<
    AtomWithInfiniteQueryOptions<
      TQueryFnData,
      TError,
      TData,
      TQueryData,
      TQueryKey
    >
  >,
  getQueryClient: GetQueryClient = (get) => get(queryClientAtom)
): WritableAtom<
  InfiniteData<TData | TQueryData> | undefined,
  AtomWithInfiniteQueryAction<TQueryFnData>
> {
  const getOptions = (get: Getter) => ({
    staleTime: 200,
    ...(typeof createQuery === 'function' ? createQuery(get) : createQuery),
  })
  const [dataAtom] = atomsWithInfiniteQuery(getOptions, getQueryClient)
  return atom(
    (get) => {
      const options = getOptions(get)
      if (options.enabled === false) {
        const queryClient = getQueryClient(get)
        return queryClient.getQueryData<InfiniteData<TData>>(options.queryKey)
      }
      return get(dataAtom)
    },
    (_get, set, action: AtomWithInfiniteQueryAction<TQueryFnData>) => {
      if (action.type === 'refetch') {
        return set(dataAtom, {
          type: 'refetch',
          force: true,
          options: action.payload as any,
        })
      }
      return set(dataAtom, action)
    }
  )
}
