import { useEffect, useRef } from 'react'
import { useAtom } from 'jotai'
import type { Atom, WritableAtom } from 'jotai'
import type { Scope, SetAtom } from '../core/atom'
import { Message } from './types'

interface DevtoolOptions {
  name?: string
  scope?: Scope
  enabled?: boolean
}
export function useAtomDevtools<Value, Result extends void | Promise<void>>(
  anAtom: WritableAtom<Value, Value, Result> | Atom<Value>,
  options?: DevtoolOptions
): void

/*
 * @deprecated Please use object options (DevtoolsOptions)
 */
export function useAtomDevtools<Value, Result extends void | Promise<void>>(
  anAtom: WritableAtom<Value, Value, Result> | Atom<Value>,
  options?: string,
  scope?: Scope
): void

export function useAtomDevtools<Value, Result extends void | Promise<void>>(
  anAtom: WritableAtom<Value, Value, Result> | Atom<Value>,
  options?: DevtoolOptions | string,
  scope?: Scope
): void {
  if (typeof options !== 'undefined' && typeof options !== 'object') {
    console.warn('[useAtomDevtools] Please use object options (DevtoolOptions)')
    options = { name: options }
    if (scope) {
      options.scope = scope
    }
  }
  const { enabled, name } = options || {}
  scope ??= options?.scope

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

  const [value, setValue] = useAtom(anAtom, scope)

  const lastValue = useRef(value)
  const isTimeTraveling = useRef(false)
  const devtools = useRef<
    ReturnType<
      NonNullable<typeof window['__REDUX_DEVTOOLS_EXTENSION__']>['connect']
    > & {
      shouldInit?: boolean
    }
  >()

  const atomName = name || anAtom.debugLabel || anAtom.toString()

  useEffect(() => {
    if (!extension) {
      return
    }
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

    const unsubscribe = (
      devtools.current as unknown as {
        // FIXME https://github.com/reduxjs/redux-devtools/issues/1097
        subscribe: (
          listener: (message: Message) => void
        ) => (() => void) | undefined
      }
    ).subscribe((message) => {
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

        computedStates.forEach(({ state }: { state: Value }, index: number) => {
          if (index === 0) {
            devtools.current?.init(state)
          } else {
            setValueIfWritable(state)
          }
        })
      }
    })
    devtools.current.shouldInit = true
    return unsubscribe
  }, [anAtom, extension, atomName, setValue])

  useEffect(() => {
    if (!devtools.current) {
      return
    }
    lastValue.current = value
    if (devtools.current.shouldInit) {
      console.log('init', value)
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
  }, [anAtom, extension, atomName, value])
}
