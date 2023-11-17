import { transformSync } from '@babel/core'
import { expect, it } from 'vitest'
import plugin from 'jotai/babel/plugin-react-refresh'

const transform = (
  code: string,
  filename?: string,
  customAtomNames?: string[],
) =>
  transformSync(code, {
    babelrc: false,
    configFile: false,
    filename,
    root: '.',
    plugins: [[plugin, { customAtomNames }]],
  })?.code

it('Should add a cache for a single atom', () => {
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

it('Should add a cache for multiple atoms', () => {
  expect(
    transform(
      `
  const countAtom = atom(0);
  const doubleAtom = atom((get) => get(countAtom) * 2);
  `,
      '/src/atoms/index.ts',
    ),
  ).toMatchInlineSnapshot(`
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
    const countAtom = globalThis.jotaiAtomCache.get(\\"/src/atoms/index.ts/countAtom\\", atom(0));
    const doubleAtom = globalThis.jotaiAtomCache.get(\\"/src/atoms/index.ts/doubleAtom\\", atom(get => get(countAtom) * 2));"
  `)
})

it('Should add a cache for multiple exported atoms', () => {
  expect(
    transform(
      `
  export const countAtom = atom(0);
  export const doubleAtom = atom((get) => get(countAtom) * 2);
  `,
      '/src/atoms/index.ts',
    ),
  ).toMatchInlineSnapshot(`
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
    export const countAtom = globalThis.jotaiAtomCache.get(\\"/src/atoms/index.ts/countAtom\\", atom(0));
    export const doubleAtom = globalThis.jotaiAtomCache.get(\\"/src/atoms/index.ts/doubleAtom\\", atom(get => get(countAtom) * 2));"
  `)
})

it('Should add a cache for a default exported atom', () => {
  expect(transform(`export default atom(0);`, '/src/atoms/index.ts'))
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
      export default globalThis.jotaiAtomCache.get(\\"/src/atoms/index.ts/defaultExport\\", atom(0));"
    `)
})

it('Should add a cache for mixed exports of atoms', () => {
  expect(
    transform(
      `
  export const countAtom = atom(0);
  export default atom((get) => get(countAtom) * 2);
  `,
      '/src/atoms/index.ts',
    ),
  ).toMatchInlineSnapshot(`
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
    export const countAtom = globalThis.jotaiAtomCache.get(\\"/src/atoms/index.ts/countAtom\\", atom(0));
    export default globalThis.jotaiAtomCache.get(\\"/src/atoms/index.ts/defaultExport\\", atom(get => get(countAtom) * 2));"
  `)
})

it('Should fail if no filename is available', () => {
  expect(() => transform(`const countAtom = atom(0);`)).toThrow(
    'Filename must be available',
  )
})

it('Should handle atoms returned from functions (#891)', () => {
  expect(
    transform(
      `function createAtom(label) {
    const anAtom = atom(0);
    anAtom.debugLabel = label;
    return anAtom;
  }
  
  const countAtom = atom(0);
  const countAtom2 = createAtom("countAtom2");
  const countAtom3 = createAtom("countAtom3");`,
      '/src/atoms/index.ts',
    ),
  ).toMatchInlineSnapshot(`
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
    function createAtom(label) {
      const anAtom = atom(0);
      anAtom.debugLabel = label;
      return anAtom;
    }
    const countAtom = globalThis.jotaiAtomCache.get(\\"/src/atoms/index.ts/countAtom\\", atom(0));
    const countAtom2 = createAtom(\\"countAtom2\\");
    const countAtom3 = createAtom(\\"countAtom3\\");"
  `)
})

it('Should handle custom atom names', () => {
  expect(
    transform(
      `const mySpecialThing = myCustomAtom(0);`,
      '/src/atoms/index.ts',
      ['myCustomAtom'],
    ),
  ).toMatchInlineSnapshot(`
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
    const mySpecialThing = globalThis.jotaiAtomCache.get(\\"/src/atoms/index.ts/mySpecialThing\\", myCustomAtom(0));"
  `)
})
