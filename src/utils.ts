import { useLayoutEffect, useEffect, useMemo } from 'react'
import { atom, WritableAtom, useAtom } from 'jotai'

const isClient =
  typeof window !== 'undefined' &&
  !/ServerSideRendering/.test(window.navigator && window.navigator.userAgent)

export const useIsoLayoutEffect = isClient ? useLayoutEffect : useEffect

export const useUpdateAtom = <Value, Update>(
  anAtom: WritableAtom<Value, Update>
) => {
  const writeOnlyAtom = useMemo(
    () => atom(null, (_get, set, update: Update) => set(anAtom, update)),
    [anAtom]
  )
  return useAtom(writeOnlyAtom)[1]
}
