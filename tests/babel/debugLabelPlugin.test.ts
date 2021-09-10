import path from 'path'
import { transformSync } from '@babel/core'

const plugin = path.join(__dirname, '../../src/babel/debugLabelPlugin')

const transform = (code: string) =>
  transformSync(code, {
    babelrc: false,
    configFile: false,
    plugins: [[plugin]],
  })?.code

it('Should add a debugLabel to an atom', () => {
  expect(
    transform(`
    const countAtom = atom(0);
    `)
  ).toMatchInlineSnapshot(`
    "const countAtom = atom(0);
    countAtom.debugLabel = \\"countAtom\\";"
  `)
})

it('Should handle a atom from a default export', () => {
  expect(
    transform(`
    const countAtom = jotai.atom(0);
    `)
  ).toMatchInlineSnapshot(`
    "const countAtom = jotai.atom(0);
    countAtom.debugLabel = \\"countAtom\\";"
  `)
})

it('Should handle a atom being exported', () => {
  expect(
    transform(`
    export const countAtom = atom(0);
    `)
  ).toMatchInlineSnapshot(`
    "export const countAtom = atom(0);
    countAtom.debugLabel = \\"countAtom\\";"
  `)
})
