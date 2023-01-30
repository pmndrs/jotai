import { MDXProvider } from '@mdx-js/react';
import { Provider as JotaiProvider } from 'jotai';
import { countAtom, menuAtom, searchAtom, textAtom } from './src/atoms';
import { Code } from './src/components/code';
import { CodeSandbox } from './src/components/code-sandbox';
import { InlineCode } from './src/components/inline-code';
import { A, H2, H3, H4, H5 } from './src/components/mdx';
import { Stackblitz } from './src/components/stackblitz';
import { TOC } from './src/components/toc';

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
      [countAtom, 0],
      [menuAtom, false],
      [searchAtom, false],
      [textAtom, 'hello'],
    ]}
  >
    <MDXProvider components={components}>{element}</MDXProvider>
  </JotaiProvider>
);

export const onRenderBody = ({ setHtmlAttributes }) => {
  setHtmlAttributes({ lang: 'en' });
};
