import {
  QueryClient,
  QueryKey,
  QueryObserver as _QueryObserver,
  QueryObserverResult,
} from '@tanstack/query-core'
import { Atom, atom } from 'jotai/core/atom'
import { atomFamily } from 'jotai/utils'
import { GetQueryClient } from './types'

type Result = QueryObserverResult<unknown, unknown>

type Listener = (result: Result) => void

class QueryObserver<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
> extends _QueryObserver<TQueryFnData, TError, TData, TQueryData, TQueryKey> {
  listeners: Listener[] = []
}

export const queryObserverFamily = atomFamily<
  [Atom<any>, QueryKey, GetQueryClient],
  Atom<QueryObserver<any, any, any, any, any>>
>(
  ([_queryDataAtom, _queryKey, getQueryClientAtom]) => {
    return atom((get) => {
      const queryClient = getQueryClientAtom(get) as QueryClient
      return new QueryObserver(queryClient, {})
    })
  },
  (a, b) => {
    return (
      (a[0] === b[0] || hashQueryKey(a[1]) === hashQueryKey(b[1])) &&
      a[2] === b[2]
    )
  }
)

/* MIT License

Copyright (c) 2021 Tanner Linsley

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE. */

function hasObjectPrototype(o: any): boolean {
  return Object.prototype.toString.call(o) === '[object Object]'
}

function isPlainObject(o: any): o is Object {
  if (!hasObjectPrototype(o)) {
    return false
  }

  // If has modified constructor
  const ctor = o.constructor
  if (typeof ctor === 'undefined') {
    return true
  }

  // If has modified prototype
  const prot = ctor.prototype
  if (!hasObjectPrototype(prot)) {
    return false
  }

  // If constructor does not have an Object-specific method
  if (!prot.hasOwnProperty('isPrototypeOf')) {
    return false
  }

  // Most likely a plain Object
  return true
}

function hashQueryKey(queryKey: QueryKey): string {
  return JSON.stringify(queryKey, (_, val) =>
    isPlainObject(val)
      ? Object.keys(val)
          .sort()
          .reduce((result, key) => {
            result[key] = val[key]
            return result
          }, {} as any)
      : val
  )
}
