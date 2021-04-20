import { subscribe, snapshot } from 'valtio/vanilla'
import { atom } from 'jotai'
import type { SetStateAction, NonFunction } from '../core/types'

const isObject = (x: unknown): x is object =>
  typeof x === 'object' && x !== null

const applyChanges = <T extends object>(proxyObject: T, prev: T, next: T) => {
  ;(Object.keys(prev) as (keyof T)[]).forEach((key) => {
    if (!(key in next)) {
      delete proxyObject[key]
    } else if (Object.is(prev[key], next[key])) {
      // unchanged
    } else if (isObject(prev[key]) && isObject(next[key])) {
      applyChanges(proxyObject[key] as any, prev[key], next[key])
    } else {
      proxyObject[key] = next[key]
    }
  })
  ;(Object.keys(next) as (keyof T)[]).forEach((key) => {
    if (!(key in prev)) {
      proxyObject[key] = next[key]
    }
  })
}

export function atomWithProxy<Value extends object>(proxyObject: Value) {
  const baseAtom = atom(snapshot(proxyObject) as NonFunction<Value>)
  baseAtom.onMount = (setValue) => {
    const callback = () => {
      setValue(snapshot(proxyObject) as Value)
    }
    const unsub = subscribe(proxyObject, callback)
    callback()
    return unsub
  }
  const derivedAtom = atom(
    (get) => get(baseAtom),
    (get, _set, update: SetStateAction<Value>) => {
      const newValue =
        typeof update === 'function'
          ? (update as (prev: Value) => Value)(get(baseAtom))
          : update
      applyChanges(proxyObject, snapshot(proxyObject) as Value, newValue)
    }
  )
  return derivedAtom
}
