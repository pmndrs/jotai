import React from 'react'
import { Provider as JotaiProvider } from 'jotai'
import { MDXProvider } from '@mdx-js/react'

import { menuAtom, textAtom, countAtom } from './src/atoms'
import {
  Code,
  CodeSandbox,
  InlineCode,
  H2,
  H3,
  H4,
  H5,
  A,
} from './src/components'

const components = {
  code: Code,
  inlineCode: InlineCode,
  CodeSandbox,
  h2: H2,
  h3: H3,
  h4: H4,
  h5: H5,
  a: A,
}

export const wrapRootElement = ({ element }) => (
  <JotaiProvider
    initialValues={[
      [menuAtom, false],
      [textAtom, 'hello'],
      [countAtom, 0],
    ]}>
    <MDXProvider components={components}>{element}</MDXProvider>
  </JotaiProvider>
)
