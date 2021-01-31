This doc describes about the behavior with async.

## Some notes

- You need to wrap components with `<Suspense>` inside `<Provider>`.
- You can have as many `<Suspense>` as you need.
- If the `read` function of an atom returns a promise, the atom will suspend.
- This applies to dependent atoms too.
- If a primitive atom has a promise as the initial value, it will suspend at the first use (when Provider doesn't have it.)
- If the `write` function of an atom returns a promise, the atom will suspend. There's no way to know as of now if an atom suspends because of `read` or `write`.
- You can create a `write` function so that it works asynchronously, but does not return a promise. In such a case, the atom won't suspend. (This means you can't catch async errors outside. So, you need to catch errors inside `write` function.)
