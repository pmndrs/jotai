/*
export {
  unstable_createMutableSource as createMutableSource,
  unstable_useMutableSource as useMutableSource,
} from 'react'
*/

// useMutableSource emulation almost equivalent to useSubscription

import { useEffect, useRef, useState } from 'react'

const TARGET = '_uMS_T'
const GET_VERSION = '_uMS_V'

type MutableSource<T, V> = {
  [TARGET]: T
  [GET_VERSION]: (target: T) => V
}

export const createMutableSource = <T, V>(
  target: T,
  getVersion: (target: T) => V
): MutableSource<T, V> => ({
  [TARGET]: target,
  [GET_VERSION]: getVersion,
})

export const useMutableSource = <T, V, S>(
  source: MutableSource<T, V>,
  getSnapshot: (target: T) => S,
  subscribe: (target: T, callback: () => void) => () => void
) => {
  const lastVersion = useRef<V>()
  const currentVersion = source[GET_VERSION](source[TARGET])
  const [state, setState] = useState(
    () =>
      [
        /* [0] */ source,
        /* [1] */ getSnapshot,
        /* [2] */ subscribe,
        /* [3] */ currentVersion,
        /* [4] */ getSnapshot(source[TARGET]),
      ] as const
  )
  let currentSnapshot = state[4]
  if (
    state[0] !== source ||
    state[1] !== getSnapshot ||
    state[2] !== subscribe
  ) {
    currentSnapshot = getSnapshot(source[TARGET])
    setState([
      /* [0] */ source,
      /* [1] */ getSnapshot,
      /* [2] */ subscribe,
      /* [3] */ currentVersion,
      /* [4] */ currentSnapshot,
    ])
  } else if (
    currentVersion !== state[3] &&
    currentVersion !== lastVersion.current
  ) {
    currentSnapshot = getSnapshot(source[TARGET])
    if (!Object.is(currentSnapshot, state[4])) {
      setState([
        /* [0] */ source,
        /* [1] */ getSnapshot,
        /* [2] */ subscribe,
        /* [3] */ currentVersion,
        /* [4] */ currentSnapshot,
      ])
    }
  }
  useEffect(() => {
    let didUnsubscribe = false
    const checkForUpdates = () => {
      if (didUnsubscribe) {
        return
      }
      try {
        const nextSnapshot = getSnapshot(source[TARGET])
        const nextVersion = source[GET_VERSION](source[TARGET])
        lastVersion.current = nextVersion
        setState((prev) => {
          if (
            prev[0] !== source ||
            prev[1] !== getSnapshot ||
            prev[2] !== subscribe
          ) {
            return prev
          }
          if (Object.is(prev[4], nextSnapshot)) {
            return prev
          }
          return [
            /* [0] */ prev[0],
            /* [1] */ prev[1],
            /* [2] */ prev[2],
            /* [3] */ nextVersion,
            /* [4] */ nextSnapshot,
          ]
        })
      } catch (e) {
        // schedule update
        setState((prev) => [...prev])
      }
    }
    const unsubscribe = subscribe(source[TARGET], checkForUpdates)
    checkForUpdates()
    return () => {
      didUnsubscribe = true
      unsubscribe()
    }
  }, [source, getSnapshot, subscribe])
  return currentSnapshot
}
