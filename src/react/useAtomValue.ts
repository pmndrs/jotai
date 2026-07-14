'use client'

import React from 'react'
import type { Atom, ExtractAtomValue } from '../vanilla.js'
import { isPromiseLike } from './continuablePromise.js'
import { useAtomValueRaw } from './useAtomValueRaw.js'

const attachPromiseStatus = <T>(
  promise: PromiseLike<T> & {
    status?: 'pending' | 'fulfilled' | 'rejected'
    value?: T
    reason?: unknown
  },
) => {
  if (!promise.status) {
    promise.status = 'pending'
    promise.then(
      (v) => {
        promise.status = 'fulfilled'
        promise.value = v
      },
      (e) => {
        promise.status = 'rejected'
        promise.reason = e
      },
    )
  }
}

const use =
  React.use ||
  // A shim for older React versions
  (<T>(
    promise: PromiseLike<T> & {
      status?: 'pending' | 'fulfilled' | 'rejected'
      value?: T
      reason?: unknown
    },
  ): T => {
    if (promise.status === 'pending') {
      throw promise
    } else if (promise.status === 'fulfilled') {
      return promise.value as T
    } else if (promise.status === 'rejected') {
      throw promise.reason
    } else {
      attachPromiseStatus(promise)
      throw promise
    }
  })

type Options = Parameters<typeof useAtomValueRaw>[1] & {
  unstable_promiseStatus?: boolean
}

export function useAtomValue<Value>(
  atom: Atom<Value>,
  options?: Options,
): Awaited<Value>

export function useAtomValue<AtomType extends Atom<unknown>>(
  atom: AtomType,
  options?: Options,
): Awaited<ExtractAtomValue<AtomType>>

export function useAtomValue<Value>(atom: Atom<Value>, options?: Options) {
  const { unstable_promiseStatus: promiseStatus = !React.use } = options || {}
  const value = useAtomValueRaw(atom, options)
  if (isPromiseLike(value)) {
    if (promiseStatus) {
      attachPromiseStatus(value)
    }
    return use(value)
  }
  return value as Awaited<Value>
}
