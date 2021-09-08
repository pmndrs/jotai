import path from 'path'
import { transformSync } from '@babel/core'

const plugin = path.join(__dirname, '../../src/babel/debugLabelPlugin')

const transform = (code: string) =>
  transformSync(code, {
    babelrc: false,
    configFile: false,
    plugins: [[plugin]],
  })?.code

it('It should add a debugLabel to an atom', () => {
  expect(
    transform(`
    const countAtom = atom(0)
    `)
  ).toMatchInlineSnapshot(`
  const countAtom = atom(0)
  countAtom.debugLabel = 'countAtom'
  `)
})
