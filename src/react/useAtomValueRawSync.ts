'use client'

import { useCallback, useDebugValue, useSyncExternalStore } from 'react'
import type { Atom, ExtractAtomValue } from '../vanilla.js'
import {
  createContinuablePromise,
  isPromiseLike,
} from './continuablePromise.js'
import { useStore } from './Provider.js'

type Options = Parameters<typeof useStore>[0]

export function useAtomValueRawSync<Value>(
  atom: Atom<Value>,
  options?: Options,
): Value

export function useAtomValueRawSync<AtomType extends Atom<unknown>>(
  atom: AtomType,
  options?: Options,
): ExtractAtomValue<AtomType>

export function useAtomValueRawSync<Value>(
  atom: Atom<Value>,
  options?: Options,
) {
  const store = useStore(options)
  const getSnapshot = useCallback(() => {
    const value = store.get(atom)
    if (isPromiseLike(value)) {
      return createContinuablePromise(store, value, () => store.get(atom))
    }
    return value
  }, [store, atom])
  const value = useSyncExternalStore(
    useCallback((callback) => store.sub(atom, callback), [store, atom]),
    getSnapshot,
    getSnapshot,
  )
  useDebugValue(value)
  return value
}
