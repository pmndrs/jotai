import path from 'path'
import { transformSync } from '@babel/core'

const plugin = path.join(__dirname, '../../src/babel/plugin-react-refresh')

const transform = (code: string, filename: string) =>
  transformSync(code, {
    babelrc: false,
    configFile: false,
    filename,
    root: '.',
    plugins: [[plugin]],
  })?.code

it('Should add a debugLabel to an atom', () => {
  expect(transform(`const countAtom = atom(0);`, '/src/atoms/index.ts'))
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
    const countAtom = globalThis.jotaiAtomCache.get(\\"/src/atoms/index.ts/countAtom\\", atom(0));"
  `)
})
