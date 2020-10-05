This doc describes about the behavior with async.

# async

`Async` is a `utility module` which provides straight-forward, powerful functions for working with asynchronous JavaScript. Although originally designed for use with Node.js and installable via npm i async, it can also be used directly in the browser.

Async is also installable via:

`yarn: yarn add async`

# async function
Async provides around 70 functions that include the usual 'functional' suspects (map, reduce, filter, each…) as well as some common patterns for asynchronous control flow (parallel, series, waterfall…). All these functions assume you follow the Node.js convention of providing a single callback as the last argument of your asynchronous function -- a callback which expects an Error as its first argument -- and calling the callback once.

You can also pass async functions to Async methods, instead of callback-accepting functions. 

# example
    ```js
    async.map(['file1','file2','file3'], fs.stat, function(err, results) {
        // results is now an array of stats for each file
    });

    async.filter(['file1','file2','file3'], function(filePath, callback) {
    fs.access(filePath, function(err) {
        callback(null, !err)
     });
    }, function(err, results) {
        // results now equals an array of the existing files
    });

    async.parallel([
        function(callback) { ... },
        function(callback) { ... }
    ], function(err, results) {
        // optional callback
    });

    async.series([
        function(callback) { ... },
        function(callback) { ... }
    ]);
    ```

## Some notes

- You need to wrap components with `<Suspense>` inside `<Provider>`.
- You can have as many `<Suspense>` as you need.
- If the `read` function of an atom returns a promise, the atom will suspend.
- This applies to dependent atoms too.
- If a primitive atom has a promise as the initial value, it will suspend at the first use (when Provider doesn't have it.)
- You can create a `read` function so that it works asynchronously, but does not return a promise. In such a case, the atom won't suspend.
- If the `write` function of an atom returns a promise, the atom will suspend. There's no way to know as of now if an atom suspends because of `read` or `write`.
- You can create a `write` function so that it works asynchronously, but does not return a promise. In such a case, the atom won't suspend. (Caveat: This means you can't catch async errors. So, it's not recommended.)
