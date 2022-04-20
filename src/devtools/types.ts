import type {} from '@redux-devtools/extension'

// FIXME https://github.com/reduxjs/redux-devtools/issues/1097
export type Message = {
  type: string
  payload?: any
  state?: any
}
