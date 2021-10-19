import path from 'path'
import { transformSync } from '@babel/core'

const preset = path.join(__dirname, '../../src/babel/preset')

const transform = (code: string, filename?: string) =>
  transformSync(code, {
    babelrc: false,
    configFile: false,
    filename,
    presets: [[preset]],
  })?.code

it('Should add a debugLabel and cache to an atom', () => {
  expect(transform(`const countAtom = atom(0);`, '/src/atoms.ts'))
    .toMatchInlineSnapshot(`
    "globalThis.jotaiAtomCache = globalThis.jotaiAtomCache || {
      cache: new Map(),

      get(name, inst) {
        if (this.cache.has(name)) {
          return this.cache.get(name);
        }

        this.cache.set(name, inst);
        return inst;
      }

    };
    const countAtom = globalThis.jotaiAtomCache.get(\\"/src/atoms.ts/countAtom\\", atom(0));
    countAtom.debugLabel = \\"countAtom\\";"
  `)
})

it('Should fail if no filename is available', () => {
  expect(() => transform(`const countAtom = atom(0);`)).toThrowError(
    'Filename must be available'
  )
})
