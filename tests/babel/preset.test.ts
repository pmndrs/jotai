import { transformSync } from '@babel/core'
import { expect, it } from 'vitest'
import preset from 'jotai/babel/preset'

const transform = (
  code: string,
  filename?: string,
  customAtomNames?: string[],
) =>
  transformSync(code, {
    babelrc: false,
    configFile: false,
    filename,
    presets: [[preset, { customAtomNames }]],
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
      const countAtom = globalThis.jotaiAtomCache.get("/src/atoms.ts/countAtom", atom(0));
      countAtom.debugLabel = "countAtom";"
    `)
})

it('Should add a debugLabel and cache to multiple atoms', () => {
  expect(
    transform(
      `
  const countAtom = atom(0);
  const doubleAtom = atom((get) => get(countAtom) * 2);`,
      '/src/atoms.ts',
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
    const countAtom = globalThis.jotaiAtomCache.get("/src/atoms.ts/countAtom", atom(0));
    countAtom.debugLabel = "countAtom";
    const doubleAtom = globalThis.jotaiAtomCache.get("/src/atoms.ts/doubleAtom", atom(get => get(countAtom) * 2));
    doubleAtom.debugLabel = "doubleAtom";"
  `)
})

it('Should add a cache and debugLabel for multiple exported atoms', () => {
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
    export const countAtom = globalThis.jotaiAtomCache.get("/src/atoms/index.ts/countAtom", atom(0));
    countAtom.debugLabel = "countAtom";
    export const doubleAtom = globalThis.jotaiAtomCache.get("/src/atoms/index.ts/doubleAtom", atom(get => get(countAtom) * 2));
    doubleAtom.debugLabel = "doubleAtom";"
  `)
})

it('Should add a cache and debugLabel for a default exported atom', () => {
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
      const atoms = globalThis.jotaiAtomCache.get("/src/atoms/index.ts/atoms", atom(0));
      atoms.debugLabel = "atoms";
      export default atoms;"
    `)
})

it('Should add a cache and debugLabel for mixed exports of atoms', () => {
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
    export const countAtom = globalThis.jotaiAtomCache.get("/src/atoms/index.ts/countAtom", atom(0));
    countAtom.debugLabel = "countAtom";
    const atoms = globalThis.jotaiAtomCache.get("/src/atoms/index.ts/atoms", atom(get => get(countAtom) * 2));
    atoms.debugLabel = "atoms";
    export default atoms;"
  `)
})

it('Should fail if no filename is available', () => {
  expect(() => transform(`const countAtom = atom(0);`)).toThrow(
    'Filename must be available',
  )
})

it('Should handle custom atom names', () => {
  expect(
    transform(`const mySpecialThing = myCustomAtom(0);`, '/src/atoms.ts', [
      'myCustomAtom',
    ]),
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
    const mySpecialThing = globalThis.jotaiAtomCache.get("/src/atoms.ts/mySpecialThing", myCustomAtom(0));
    mySpecialThing.debugLabel = "mySpecialThing";"
  `)
})
