import path from 'path'
import { transformSync } from '@babel/core'

const plugin = path.join(__dirname, '../../src/babel/plugin-debug-label')

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

it('Should handle all atom types', () => {
  expect(
    transform(
      `
      export const countAtom = atom(0);

      const myFamily = atomFamily((param) => atom(param));

      const countAtomWithDefault = atomWithDefault((get) => get(countAtom) * 2);

      const observableAtom = atomWithObservable(() => {});

      const reducerAtom = atomWithReducer(0, () => {});

      const resetAtom = atomWithReset(0);

      const storageAtom = atomWithStorage('count', 1);

      const suspenseAtom = atomWithSuspense();

      const freezedAtom = freezeAtom(atom({ count: 0 }));

      const loadedAtom = loadable(countAtom);

      const selectedValueAtom = selectAtom(atom({ a: 0, b: 'othervalue' }), (v) => v.a);

      const splittedAtom = splitAtom(atom([]));
    `,
      'atoms/index.ts'
    )
  ).toMatchInlineSnapshot(`
    "export const countAtom = atom(0);
    countAtom.debugLabel = \\"countAtom\\";
    const myFamily = atomFamily(param => atom(param));
    myFamily.debugLabel = \\"myFamily\\";
    const countAtomWithDefault = atomWithDefault(get => get(countAtom) * 2);
    countAtomWithDefault.debugLabel = \\"countAtomWithDefault\\";
    const observableAtom = atomWithObservable(() => {});
    observableAtom.debugLabel = \\"observableAtom\\";
    const reducerAtom = atomWithReducer(0, () => {});
    reducerAtom.debugLabel = \\"reducerAtom\\";
    const resetAtom = atomWithReset(0);
    resetAtom.debugLabel = \\"resetAtom\\";
    const storageAtom = atomWithStorage('count', 1);
    storageAtom.debugLabel = \\"storageAtom\\";
    const suspenseAtom = atomWithSuspense();
    suspenseAtom.debugLabel = \\"suspenseAtom\\";
    const freezedAtom = freezeAtom(atom({
      count: 0
    }));
    freezedAtom.debugLabel = \\"freezedAtom\\";
    const loadedAtom = loadable(countAtom);
    loadedAtom.debugLabel = \\"loadedAtom\\";
    const selectedValueAtom = selectAtom(atom({
      a: 0,
      b: 'othervalue'
    }), v => v.a);
    selectedValueAtom.debugLabel = \\"selectedValueAtom\\";
    const splittedAtom = splitAtom(atom([]));
    splittedAtom.debugLabel = \\"splittedAtom\\";"
  `)
})
