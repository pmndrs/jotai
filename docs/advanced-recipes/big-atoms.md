# Big Atoms

Sometimes we have big data we need to keep into atoms, we may need to change that data in some levels, or we need to use part of that data, but we can't listen to all these changes or use all that data for just a specific part.

consider this example.

```jsx
const initialData = {
  people: [
    {
      name: 'Luke Skywalker',
      information: { height: 172 },
      siblings: ['John Skywalker', 'Doe Skywalker'],
    },
    {
      name: 'C-3PO',
      information: { height: 167 },
      siblings: ['John Doe', 'Doe John'],
    },
    // ... n more
  ],
  films: [
    {
      title: 'A New Hope',
      id: 4,
      planets: [{ name: 'Tatooine' }, { name: 'Alderaan' }],
    },
    {
      title: 'The Empire Strikes Back',
      id: 5,
      planets: [{ name: 'Hoth' }],
    },
    // ... n more
  ],
  // ... n more specific fields
}
```

[codesandbox](https://codesandbox.io/s/zealous-sun-f2qnl?file=/src/App.tsx)

## `focusAtom`

> `focusAtom` creates a new atom, based on the focus that you pass to it. [jotai/optics](https://github.com/pmndrs/jotai/blob/master/docs/api/optics.md#focusatom)

We use this utility to focus an atom and create an atom of a specific part of the data. For example we may need to consume the people property of the above data, Here's how we do it.

```jsx
const dataAtom = atom(initialData)

const peopleAtom = focusAtom(dataAtom, (optic) => optic.prop('people'))
```

`focusAtom` returns `WritableAtom` which means it's possible to change the `peopleAtom` data.

If we change the `film` property of the above data example, the `peopleAtom` won't cause us a re-render, so that's one of the points of using `focusAtom`.

## `splitAtom`

> The `splitAtom` utility is useful for when you want to get an atom for each element in a list. [jotai/utils](https://github.com/pmndrs/jotai/blob/master/docs/api/utils.md#splitatom)

We use this utility for atoms that return arrays as their values, for example the `peopleAtom` we made above returns the people property array, so we can return an atom for each item of that array.

```jsx
const peopleAtom = focusAtom(dataAtom, (optic) => optic.prop('people'))
```

And that's how we use it in components.

```jsx
const People = () => {
  const [peopleAtoms] = useAtom(peopleAtomsAtom)
  return (
    <div>
      {peopleAtoms.map((personAtom) => (
        <Person personAtom={personAtom} key={`${personAtom}`} />
      ))}
    </div>
  )
}
```
