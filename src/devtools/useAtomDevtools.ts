import { useEffect, useRef } from 'react'
import { useAtom, WritableAtom } from 'jotai'

import type { SetStateAction } from '../core/types'

export function useAtomDevtools<Value>(
  anAtom: WritableAtom<Value, SetStateAction<Value>>
) {
  let extension: any
  try {
    extension = (window as any).__REDUX_DEVTOOLS_EXTENSION__
  } catch {}
  if (!extension) {
    if (
      process.env.NODE_ENV === 'development' &&
      typeof window !== 'undefined'
    ) {
      console.warn('Please install/enable Redux devtools extension')
    }
  }

  const [value, setValue] = useAtom(anAtom)
  const lastValue = useRef(value)
  const devtools = useRef<any>()

  useEffect(() => {
    if (extension) {
      const name = `${anAtom.key}:${anAtom.debugLabel ?? '<no debugLabel>'}`
      devtools.current = extension.connect({ name })
      const unsubscribe = devtools.current.subscribe((message: any) => {
        if (message.type === 'DISPATCH' && message.state) {
          setValue(message.state)
        } else if (
          message.type === 'DISPATCH' &&
          message.payload?.type === 'COMMIT'
        ) {
          devtools.current.init(lastValue.current)
        }
      })
      devtools.current.shouldInit = true
      return unsubscribe
    }
  }, [anAtom, extension, setValue])

  useEffect(() => {
    if (devtools.current) {
      lastValue.current = value
      if (devtools.current.shouldInit) {
        devtools.current.init(value)
        devtools.current.shouldInit = false
      } else {
        devtools.current.send('update', value)
      }
    }
  }, [anAtom, extension, value])
}
