import React from 'react'
import { Provider as JotaiProvider } from 'jotai'
import { MDXProvider } from '@mdx-js/react'

import { menuAtom, textAtom, countAtom } from './src/atoms'
import { Code, CodeSandbox, InlineCode } from './src/components'

const components = {
  code: Code,
  inlineCode: InlineCode,
  CodeSandbox,
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
