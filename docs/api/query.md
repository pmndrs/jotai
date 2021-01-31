This doc describes `jotai/query` bundle.

## Install

You have to install `react-query` to access this bundle and its functions.

```
yarn add react-query
```

## atomWithQuery

`atomWithQuery` creates a new atom with React Query.

```js
import { useAtom } from 'jotai'
import { atomWithQuery } from 'jotai/query'

const queryAtom = atomWithQuery('repoData', async () => {
  const response = await fetch(
    'https://api.github.com/repos/tannerlinsley/react-query'
  )
  return response.json()
})

const RepoData = () => {
  const [data] = useAtom(queryAtom)
  return <div>{JSON.stringify(data)}</div>
}
```

### Examples

TODO
