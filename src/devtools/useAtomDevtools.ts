import type {} from '@redux-devtools/extension'
import { useEffect, useRef } from 'react'
import { useAtom } from 'jotai'
import type { Atom, WritableAtom } from 'jotai'
import type { Scope, SetAtom } from '../core/atom'

type Message = {
  type: string
  payload?: any
  state?: any
}

interface Action<T = any> {
  type: T
}

interface ConnectResponse {
  init: (state: unknown) => void
  send: (action: Action<unknown>, state: unknown) => void
}

export function useAtomDevtools<Value, Result extends void | Promise<void>>(
  anAtom: WritableAtom<Value, Value, Result> | Atom<Value>,
  name?: string,
  scope?: Scope
): void {
  let extension = window?.__REDUX_DEVTOOLS_EXTENSION__

  if (!extension) {
    if (__DEV__ && typeof window !== 'undefined') {
      console.warn('Please install/enable Redux devtools extension')
    }
  }

  const [value, setValue] = useAtom(anAtom, scope)

  const lastValue = useRef(value)
  const isTimeTraveling = useRef(false)
  const devtools = useRef<ConnectResponse &  {
        subscribe?: (
          listener: (message: any) => void // FIXME no-any
        ) => (() => void) | undefined
      }   & { shouldInit?: boolean }>()

  const atomName = name || anAtom.debugLabel || anAtom.toString()

  useEffect(() => {
    if (extension) {
      const setValueIfWritable = (value: Value) => {
        if (typeof setValue === 'function') {
          ;(setValue as SetAtom<Value, void>)(value)
          return
        }
        console.warn(
          '[Warn] you cannot do write operations (Time-travelling, etc) in read-only atoms\n',
          anAtom
        )
      }

      devtools.current = extension.connect({ name: atomName })
      const unsubscribe = devtools.current.subscribe!((message: Message) => {
        if (message.type === 'ACTION' && message.payload) {
          try {
            setValueIfWritable(JSON.parse(message.payload))
          } catch (e) {
            console.error(
              'please dispatch a serializable value that JSON.parse() support\n',
              e
            )
          }
        } else if (message.type === 'DISPATCH' && message.state) {
          if (
            message.payload?.type === 'JUMP_TO_ACTION' ||
            message.payload?.type === 'JUMP_TO_STATE'
          ) {
            isTimeTraveling.current = true

            setValueIfWritable(JSON.parse(message.state))
          }
        } else if (
          message.type === 'DISPATCH' &&
          message.payload?.type === 'COMMIT'
        ) {
          devtools.current?.init(lastValue.current)
        } else if (
          message.type === 'DISPATCH' &&
          message.payload?.type === 'IMPORT_STATE'
        ) {
          const computedStates =
            message.payload.nextLiftedState?.computedStates || []

          computedStates.forEach(
            ({ state }: { state: Value }, index: number) => {
              if (index === 0) {
                devtools.current?.init(state)
              } else {
                setValueIfWritable(state)
              }
            }
          )
        }
      })
      devtools.current.shouldInit = true
      return unsubscribe
    }
  }, [anAtom, extension, atomName, setValue])

  useEffect(() => {
    if (devtools.current) {
      lastValue.current = value
      if (devtools.current.shouldInit) {
        devtools.current.init(value)
        devtools.current.shouldInit = false
      } else if (isTimeTraveling.current) {
        isTimeTraveling.current = false
      } else {
        devtools.current.send(
          `${atomName} - ${new Date().toLocaleString()}` as any,
          value
        )
      }
    }
  }, [anAtom, extension, atomName, value])
}
