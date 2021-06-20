import React from 'react'
import { Provider } from 'jotai'

import { textAtom, countAtom } from './src/atoms'

export const wrapRootElement = ({ element }) => (
  <Provider
    initialValues={[
      [textAtom, 'hello'],
      [countAtom, 0],
    ]}>
    {element}
  </Provider>
)
