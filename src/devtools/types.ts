import type {} from '@redux-devtools/extension'

type Message = {
  type: string
  payload?: any
  state?: any
}

interface Action<T = any> {
  type: T
}

export interface ConnectResponse {
  init: (state: unknown) => void
  send: (action: Action<unknown>, state: unknown) => void
  subscribe?: (listener: (message: Message) => void) => (() => void) | undefined
  shouldInit?: boolean
}
