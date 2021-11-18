import { useEffect, useRef } from 'react'
import { useAtom } from 'jotai'
import type { Atom, WritableAtom } from 'jotai'
import type { Scope, SetAtom } from '../core/atom'

type Config = {
  instanceID?: number
  name?: string
  serialize?: boolean
  actionCreators?: any
  latency?: number
  predicate?: any
  autoPause?: boolean
}

type Message = {
  type: string
  payload?: any
  state?: any
}

type ConnectionResult = {
  subscribe: (dispatch: any) => () => void
  unsubscribe: () => void
  send: (action: string, state: any) => void
  init: (state: any) => void
  error: (payload: any) => void
}

type Extension = {
  connect: (options?: Config) => ConnectionResult
}

export function useAtomDevtools<Value, Result extends void | Promise<void>>(
  anAtom: WritableAtom<Value, Value, Result> | Atom<Value>,
  name?: string,
  scope?: Scope
): void {
  let extension: Extension | undefined
  try {
    extension = (window as any).__REDUX_DEVTOOLS_EXTENSION__ as Extension
  } catch {}
  if (!extension) {
    if (
      typeof process === 'object' &&
      process.env.NODE_ENV === 'development' &&
      typeof window !== 'undefined'
    ) {
      console.warn('Please install/enable Redux devtools extension')
    }
  }

  const [value, setValue] = useAtom(anAtom, scope)

  const lastValue = useRef(value)
  const isTimeTraveling = useRef(false)
  const devtools = useRef<ConnectionResult & { shouldInit?: boolean }>()

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
      const unsubscribe = devtools.current.subscribe((message: Message) => {
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
          `${atomName} - ${new Date().toLocaleString()}`,
          value
        )
      }
    }
  }, [anAtom, extension, atomName, value])
}
