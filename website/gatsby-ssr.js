import React from 'react'
import { Provider } from 'jotai'

import { menuAtom, textAtom, countAtom } from './src/atoms'

export const wrapRootElement = ({ element }) => (
  <Provider
    initialValues={[
      [menuAtom, false],
      [textAtom, 'hello'],
      [countAtom, 0],
    ]}>
    {element}
  </Provider>
)
