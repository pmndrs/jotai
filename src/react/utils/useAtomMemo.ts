import { useEffect, useMemo, useRef, useState } from 'react'
import { Atom } from '../../vanilla.ts'
import { useStore } from '../Provider.ts'

type Store = ReturnType<typeof useStore>

type Options = {
  store?: Store
  delay?: number
}

export function useAtomValueMemo<Value extends object>(
  atom: Atom<Value>,
  options?: Options,
) {
  const store = useStore(options)
  const trackMapRef = useRef<Map<string, Value[keyof Value]> | null>(null)
  if (!trackMapRef.current) {
    trackMapRef.current = new Map()
  }
  const [, rerender] = useState<number>(0)
  const delay = options?.delay
  useEffect(() => {
    const unsub = store.sub(atom, () => {
      const trackMap = trackMapRef.current!
      let changed = false
      const currentValue = store.get(atom)
      for (const key of trackMap.keys()) {
        if (currentValue[key as keyof Value] !== trackMap.get(key)) {
          changed = true
          break
        }
      }
      trackMap.clear()
      if (!changed) {
        return
      }
      if (typeof delay === 'number') {
        setTimeout(rerender)
        return
      }
      rerender((c) => c + 1)
    })
    rerender((c) => c + 1)
    return unsub
  }, [store, atom, delay])

  return useMemo(() => {
    return new Proxy<Value>({} as Value, {
      get: (_, key: string) => {
        const value = store.get(atom)
        if (!(key in value)) {
          throw new Error(`No key "${key}" in atom`)
        }
        const trackSet = trackMapRef.current!
        const returnValue = value[key as keyof Value]
        if (!trackSet.has(key)) {
          trackSet.set(key, returnValue)
        }
        return returnValue satisfies Value[keyof Value]
      },
    })
  }, [atom, store])
}
