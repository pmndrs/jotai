import path from 'path'
import { transformSync } from '@babel/core'

const plugin = path.join(__dirname, '../../src/babel/debugLabelPlugin')

const transform = (code: string, filename?: string) =>
  transformSync(code, {
    babelrc: false,
    configFile: false,
    filename,
    plugins: [[plugin]],
  })?.code

it('Should add a debugLabel to an atom', () => {
  expect(transform(`const countAtom = atom(0);`)).toMatchInlineSnapshot(`
    "const countAtom = atom(0);
    countAtom.debugLabel = \\"countAtom\\";"
  `)
})

it('Should handle a atom from a default export', () => {
  expect(transform(`const countAtom = jotai.atom(0);`)).toMatchInlineSnapshot(`
    "const countAtom = jotai.atom(0);
    countAtom.debugLabel = \\"countAtom\\";"
  `)
})

it('Should handle a atom being exported', () => {
  expect(transform(`export const countAtom = atom(0);`)).toMatchInlineSnapshot(`
    "export const countAtom = atom(0);
    countAtom.debugLabel = \\"countAtom\\";"
  `)
})

it('Should handle a default exported atom', () => {
  expect(transform(`export default atom(0);`, 'countAtom.ts'))
    .toMatchInlineSnapshot(`
    "const countAtom = atom(0);
    countAtom.debugLabel = \\"countAtom\\";
    export default countAtom;"
  `)
})

it('Should handle a default exported atom in a barrel file', () => {
  expect(transform(`export default atom(0);`, 'atoms/index.ts'))
    .toMatchInlineSnapshot(`
    "const atoms = atom(0);
    atoms.debugLabel = \\"atoms\\";
    export default atoms;"
  `)
})

it('Should handle all types of exports', () => {
  expect(
    transform(
      `
      export const countAtom = atom(0);
      export default atom(0);
    `,
      'atoms/index.ts'
    )
  ).toMatchInlineSnapshot(`
    "export const countAtom = atom(0);
    countAtom.debugLabel = \\"countAtom\\";
    const atoms = atom(0);
    atoms.debugLabel = \\"atoms\\";
    export default atoms;"
  `)
})
