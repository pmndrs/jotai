import { useEffect, useRef } from 'react'
import type { Atom } from '../core/atom'
import { Message } from './types'
import { useAtomsSnapshot } from './useAtomsSnapshot'
import { useGotoAtomsSnapshot } from './useGotoAtomsSnapshot'

type Scope = NonNullable<Parameters<typeof useAtomsSnapshot>[0]>

type AnyAtomValue = unknown
type AnyAtom = Atom<AnyAtomValue>
type AtomsValues = Map<AnyAtom, AnyAtomValue> // immutable
type AtomsDependents = Map<AnyAtom, Set<AnyAtom>> // immutable
type AtomsSnapshot = Readonly<{
  values: AtomsValues
  dependents: AtomsDependents
}>

const atomToPrintable = (atom: AnyAtom) =>
  atom.debugLabel ? `${atom}:${atom.debugLabel}` : `${atom}`

const getDevtoolsState = (atomsSnapshot: AtomsSnapshot) => {
  const values: Record<string, AnyAtomValue> = {}
  atomsSnapshot.values.forEach((v, atom) => {
    values[atomToPrintable(atom)] = v
  })
  const dependents: Record<string, string[]> = {}
  atomsSnapshot.dependents.forEach((d, atom) => {
    dependents[atomToPrintable(atom)] = Array.from(d).map(atomToPrintable)
  })
  return {
    values,
    dependents,
  }
}

type DevtoolsOptions = {
  scope?: Scope
  enabled?: boolean
}

export function useAtomsDevtools(name: string, options?: DevtoolsOptions): void

/*
 * @deprecated Please use object options (DevtoolsOptions)
 */
export function useAtomsDevtools(name: string, scope?: Scope): void

export function useAtomsDevtools(
  name: string,
  options?: DevtoolsOptions | Scope
) {
  if (typeof options !== 'undefined' && typeof options !== 'object') {
    console.warn('DEPRECATED [useAtomsDevtools] use DevtoolsOptions')
    options = { scope: options }
  }
  const { enabled, scope } = options || {}

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

  // This an exception, we don't usually use utils in themselves!
  const atomsSnapshot = useAtomsSnapshot(scope)
  const goToSnapshot = useGotoAtomsSnapshot(scope)

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
    if (!extension) {
      return
    }
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
              goToSnapshot(getSnapshotAt(message.payload.actionId - 1))
              break

            case 'PAUSE_RECORDING':
              isRecording.current = !isRecording.current
              break
          }
      }
    })

    devtools.current = connection
    devtools.current.shouldInit = true
    return () => {
      ;(extension as any).disconnect()
      devtoolsUnsubscribe?.()
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
