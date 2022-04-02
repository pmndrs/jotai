/* eslint-disable react-hooks/rules-of-hooks */
import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { SECRET_INTERNAL_getScopeContext as getScopeContext } from 'jotai'
import type { Atom, Scope } from '../core/atom'
import {
  DEV_GET_ATOM_STATE,
  DEV_GET_MOUNTED,
  DEV_GET_MOUNTED_ATOMS,
  DEV_SUBSCRIBE_STATE,
  RESTORE_ATOMS,
} from '../core/store'
import { Message } from './types'

type AnyAtomValue = unknown
type AnyAtom = Atom<AnyAtomValue>
type AtomsValues = Map<AnyAtom, AnyAtomValue> // immutable
type AtomsDependents = Map<AnyAtom, Set<AnyAtom>> // immutable
type AtomsSnapshot = readonly [AtomsValues, AtomsDependents]

const isEqualAtomsValues = (left: AtomsValues, right: AtomsValues) =>
  left.size === right.size &&
  Array.from(left).every(([left, v]) => Object.is(right.get(left), v))

const isEqualAtomsDependents = (
  left: AtomsDependents,
  right: AtomsDependents
) =>
  left.size === right.size &&
  Array.from(left).every(([a, dLeft]) => {
    const dRight = right.get(a)
    return (
      dRight &&
      dLeft.size === dRight.size &&
      Array.from(dLeft).every((d) => dRight.has(d))
    )
  })

const atomToPrintable = (atom: AnyAtom) =>
  atom.debugLabel ? `${atom}:${atom.debugLabel}` : `${atom}`

const getDevtoolsState = (atomsSnapshot: AtomsSnapshot) => {
  const values: Record<string, AnyAtomValue> = {}
  atomsSnapshot[0].forEach((v, atom) => {
    values[atomToPrintable(atom)] = v
  })
  const dependents: Record<string, string[]> = {}
  atomsSnapshot[1].forEach((d, atom) => {
    dependents[atomToPrintable(atom)] = Array.from(d).map(atomToPrintable)
  })
  return {
    values,
    dependents,
  }
}

interface DevtoolsOptions {
  scope?: Scope
  enabled?: boolean
}

export function useAtomsDevtools(name: string, options?: DevtoolsOptions): void
/*
 * @deprecated Please use object options (DevtoolsOptions)
 */
export function useAtomsDevtools(name: string, options?: Scope): void

export function useAtomsDevtools(
  name: string,
  options?: DevtoolsOptions | Scope
) {
  if (typeof options !== 'undefined' && typeof options !== 'object') {
    options = { scope: options }
    console.warn(
      '[useAtomsDevtools] Please use object options (DevtoolsOptions)'
    )
  }
  const { enabled, scope } = options || {}
  const ScopeContext = getScopeContext(scope)
  const { s: store, w: versionedWrite } = useContext(ScopeContext)

  if (enabled === false || !__DEV__) {
    return
  }
  if (!store[DEV_SUBSCRIBE_STATE]) {
    throw new Error('useAtomsDevtools can only be used in dev mode.')
  }

  const [atomsSnapshot, setAtomsSnapshot] = useState<AtomsSnapshot>(() => [
    new Map(),
    new Map(),
  ])

  useEffect(() => {
    const callback = () => {
      const values: AtomsValues = new Map()
      const dependents: AtomsDependents = new Map()
      for (const atom of store[DEV_GET_MOUNTED_ATOMS]?.() || []) {
        const atomState = store[DEV_GET_ATOM_STATE]?.(atom)
        if (atomState) {
          if (atomState.r === atomState.i) {
            // ignore if there are any invalidated atoms
            return
          }
          if ('v' in atomState) {
            values.set(atom, atomState.v)
          }
        }
        const mounted = store[DEV_GET_MOUNTED]?.(atom)
        if (mounted) {
          dependents.set(atom, mounted.t)
        }
      }
      setAtomsSnapshot((prev) => {
        if (
          isEqualAtomsValues(prev[0], values) &&
          isEqualAtomsDependents(prev[1], dependents)
        ) {
          // bail out
          return prev
        }
        return [values, dependents]
      })
    }
    const unsubscribe = store[DEV_SUBSCRIBE_STATE]?.(callback)
    callback()
    return unsubscribe
  }, [store])

  const goToSnapshot = useCallback(
    (values: Iterable<readonly [AnyAtom, AnyAtomValue]>) => {
      if (versionedWrite) {
        versionedWrite((version) => {
          store[RESTORE_ATOMS](values, version)
        })
      } else {
        store[RESTORE_ATOMS](values)
      }
    },
    [store, versionedWrite]
  )

  let extension: typeof window['__REDUX_DEVTOOLS_EXTENSION__'] | false

  try {
    extension = (enabled ?? __DEV__) && window.__REDUX_DEVTOOLS_EXTENSION__
  } catch {
    // ignored
  }

  if (!extension) {
    if (__DEV__ && enabled) {
      console.warn('Please install/enable Redux devtools extension')
    }
  }

  if (!store[DEV_SUBSCRIBE_STATE]) {
    throw new Error('useAtomsSnapshot can only be used in dev mode.')
  }

  const isTimeTraveling = useRef(false)
  const isRecording = useRef(true)
  const devtools = useRef<
    ReturnType<
      NonNullable<typeof window['__REDUX_DEVTOOLS_EXTENSION__']>['connect']
    > & {
      shouldInit?: boolean
    }
  >()

  const snapshots = useRef<AtomsSnapshot[]>([])

  useEffect(() => {
    if (extension) {
      const getSnapshotAt = (index = snapshots.current.length - 1) => {
        // index 0 is @@INIT, so we need to return the next action (0)
        const snapshot = snapshots.current[index >= 0 ? index : 0]
        if (!snapshot) {
          throw new Error('snaphost index out of bounds')
        }
        return snapshot
      }
      const connection = extension.connect({ name })

      const devtoolsUnsubscribe = (
        connection as unknown as {
          // FIXME https://github.com/reduxjs/redux-devtools/issues/1097
          subscribe: (
            listener: (message: Message) => void
          ) => (() => void) | undefined
        }
      ).subscribe((message) => {
        switch (message.type) {
          case 'DISPATCH':
            switch (message.payload?.type) {
              case 'RESET':
                // TODO
                break

              case 'COMMIT':
                connection.init(getDevtoolsState(getSnapshotAt()))
                snapshots.current = []
                break

              case 'JUMP_TO_ACTION':
              case 'JUMP_TO_STATE':
                isTimeTraveling.current = true
                goToSnapshot(getSnapshotAt(message.payload.actionId - 1)[0])
                break

              case 'PAUSE_RECORDING':
                isRecording.current = !isRecording.current
                break
            }
        }
      })

      devtools.current = connection
      devtools.current.shouldInit = true
      return devtoolsUnsubscribe
    }
  }, [extension, goToSnapshot, name])

  useEffect(() => {
    if (!devtools.current) {
      return
    }
    if (devtools.current.shouldInit) {
      devtools.current.init(undefined)
      devtools.current.shouldInit = false
      return
    }
    if (isTimeTraveling.current) {
      isTimeTraveling.current = false
    } else if (isRecording.current) {
      snapshots.current.push(atomsSnapshot)
      devtools.current.send(
        {
          type: `${snapshots.current.length}`,
          updatedAt: new Date().toLocaleString(),
        } as any,
        getDevtoolsState(atomsSnapshot)
      )
    }
  }, [atomsSnapshot])
}
