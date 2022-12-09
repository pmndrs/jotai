import type {} from '@redux-devtools/extension'

// FIXME https://github.com/reduxjs/redux-devtools/issues/1097
// This is an INTERNAL type alias.
export type Message = {
  type: string
  payload?: any
  state?: any
}
