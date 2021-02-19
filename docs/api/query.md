This doc describes `jotai/query` bundle.

## Install

You have to install `react-query` to access this bundle and its functions.

```
yarn add react-query
```

## atomWithQuery

`atomWithQuery` creates a new atom with React Query. This function helps you use both atoms features and `useQuery` features in a single atom.

```js
import { useAtom } from 'jotai'
import { atomWithQuery } from 'jotai/query'

const idAtom = atom(1)
const userAtom = atomWithQuery((get) => ({
  queryKey: ['users', get(idAtom)],
  queryFn: async ({ queryKey: [, id] }) => {
    const res = await fetch(`https://jsonplaceholder.typicode.com/users/${id}`)
    return res.json()
  },
}))

const UserData = () => {
  const [data] = useAtom(userAtom)
  return <div>{JSON.stringify(data)}</div>
}
```

### Examples

Basic demo: [codesandbox](https://codesandbox.io/s/jotai-query-demo-ij2sd)

Hackernews: [codesandbox](https://codesandbox.io/s/jotai-query-hacker-news-u4sli)
