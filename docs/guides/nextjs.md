# How to use jotai with next.js

### You can't return promises in server side rendering

```js
const postData = atom((get) => {
  const id = get(postId)
  if (isSSR || prefetchedPostData[id]) {
    return prefetchedPostData[id] || EMPTY_POST_DATA
  }
  return fetchData(id) // returns a promise
})
```

### Hydration is possible with care

Check the following examples.

## Examples

## Clock

https://codesandbox.io/s/nextjs-with-jotai-5ylrj

## HN Posts

https://codesandbox.io/s/nextjs-with-jotai-async-pm0l8
