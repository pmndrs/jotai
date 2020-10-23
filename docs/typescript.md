# How to use jotai with typescript

## Version requirement

jotai uses TypeScript 3.8+ syntax. Upgrade your TypeScript version if you're on 3.7.5 or lower.

## Notes

### Primitive atoms are basically type inferred

```ts
const numAtom = atom(0) // primitive number atom
const strAtom = atom('') // primitive string atom
```

### Primitive atoms can be explicitly typed

```ts
const numAtom = atom<number>(0)
const numAtom = atom<number | null>(0)
const arrAtom = atom<string[]>([])
```

### Derived atoms are also type inferred and explicitly typed

```ts
const asyncStrAtom = atom(async () => "foo")
const writeOnlyAtom = atom(null, (_get, set, str: string) => set(fooAtom, str)
const readWriteAtom = atom<string, number>(
  get => get(strAtom),
  (_get, set, num) => set(strAtom, String(num))
)
```

### useAtom is typed based on atom types

```ts
const [num, setNum] = useAtom(primitiveNumAtom)
const [num] = useAtom(readOnlyNumAtom)
const [, setNum] = useAtom(writeOnlyNumAtom)
```
