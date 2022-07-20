import { MDXProvider } from '@mdx-js/react';
import { Provider as JotaiProvider } from 'jotai';
import { countAtom, menuAtom, textAtom } from './src/atoms';
import {
  A,
  Code,
  CodeSandbox,
  H2,
  H3,
  H4,
  H5,
  InlineCode,
  Stackblitz,
  TOC,
} from './src/components';

const components = {
  code: Code,
  inlineCode: InlineCode,
  CodeSandbox,
  Stackblitz,
  TOC,
  h2: H2,
  h3: H3,
  h4: H4,
  h5: H5,
  a: A,
};

export const wrapRootElement = ({ element }) => (
  <JotaiProvider
    initialValues={[
      [menuAtom, false],
      [textAtom, 'hello'],
      [countAtom, 0],
    ]}
  >
    <MDXProvider components={components}>{element}</MDXProvider>
  </JotaiProvider>
);
