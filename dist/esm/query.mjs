import { QueryClient, QueryObserver, InfiniteQueryObserver, isCancelledError } from 'react-query';
import { atom } from 'jotai';

const queryClientAtom = atom(new QueryClient());

function atomWithQuery(createQuery, getQueryClient = (get) => get(queryClientAtom)) {
  const queryDataAtom = atom((get) => {
    const queryClient = getQueryClient(get);
    const options = typeof createQuery === "function" ? createQuery(get) : createQuery;
    let settlePromise = null;
    const getInitialData = () => {
      let data = queryClient.getQueryData(options.queryKey);
      if (data === void 0 && options.initialData) {
        data = typeof options.initialData === "function" ? options.initialData() : options.initialData;
      }
      return data;
    };
    const initialData = getInitialData();
    const dataAtom = atom(initialData || new Promise((resolve, reject) => {
      settlePromise = (data, err) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      };
    }));
    let setData = () => {
      throw new Error("atomWithQuery: setting data without mount");
    };
    const listener = (result) => {
      if (result.error) {
        if (settlePromise) {
          settlePromise(void 0, result.error);
          settlePromise = null;
        } else {
          setData(Promise.reject(result.error));
        }
        return;
      }
      if (result.data === void 0) {
        return;
      }
      if (settlePromise) {
        settlePromise(result.data);
        settlePromise = null;
      } else {
        setData(result.data);
      }
    };
    const defaultedOptions = queryClient.defaultQueryObserverOptions(options);
    if (typeof defaultedOptions.staleTime !== "number") {
      defaultedOptions.staleTime = 1e3;
    }
    const observer = new QueryObserver(queryClient, defaultedOptions);
    if (initialData === void 0 && options.enabled !== false) {
      observer.fetchOptimistic(defaultedOptions).then(listener).catch((error) => listener({ error }));
    }
    dataAtom.onMount = (update) => {
      setData = update;
      const unsubscribe = observer.subscribe(listener);
      if (options.enabled === false) {
        if (settlePromise) {
          settlePromise(void 0);
        } else {
          setData(void 0);
        }
      }
      return unsubscribe;
    };
    return { dataAtom, observer };
  }, (get, set, action) => {
    switch (action.type) {
      case "refetch": {
        const { dataAtom, observer } = get(queryDataAtom);
        set(dataAtom, new Promise(() => {
        }));
        const p = Promise.resolve().then(() => observer.refetch({ cancelRefetch: true })).then(() => {
        });
        return p;
      }
    }
  });
  const queryAtom = atom((get) => {
    const { dataAtom } = get(queryDataAtom);
    return get(dataAtom);
  }, (_get, set, action) => set(queryDataAtom, action));
  return queryAtom;
}

var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
typeof require !== "undefined" ? require : (x) => {
  throw new Error('Dynamic require of "' + x + '" is not supported');
};
var __objRest = (source, exclude) => {
  var target = {};
  for (var prop in source)
    if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
      target[prop] = source[prop];
  if (source != null && __getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(source)) {
      if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
        target[prop] = source[prop];
    }
  return target;
};
function atomWithInfiniteQuery(createQuery, getQueryClient = (get) => get(queryClientAtom)) {
  const queryDataAtom = atom((get) => {
    const queryClient = getQueryClient(get);
    const options = typeof createQuery === "function" ? createQuery(get) : createQuery;
    let settlePromise = null;
    const getInitialData = () => {
      let data = queryClient.getQueryData(options.queryKey);
      if (data === void 0 && options.initialData) {
        data = typeof options.initialData === "function" ? options.initialData() : options.initialData;
      }
      return data;
    };
    const initialData = getInitialData();
    const dataAtom = atom(initialData || new Promise((resolve, reject) => {
      settlePromise = (data, err) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      };
    }));
    let setData = () => {
      throw new Error("atomWithInfiniteQuery: setting data without mount");
    };
    const listener = (result) => {
      if (result.error && !isCancelledError(result.error)) {
        if (settlePromise) {
          settlePromise(void 0, result.error);
          settlePromise = null;
        } else {
          setData(Promise.reject(result.error));
        }
        return;
      }
      if (result.data === void 0) {
        return;
      }
      if (settlePromise) {
        settlePromise(result.data);
        settlePromise = null;
      } else {
        setData(result.data);
      }
    };
    const defaultedOptions = queryClient.defaultQueryObserverOptions(options);
    if (typeof defaultedOptions.staleTime !== "number") {
      defaultedOptions.staleTime = 1e3;
    }
    const observer = new InfiniteQueryObserver(queryClient, defaultedOptions);
    if (initialData === void 0 && options.enabled !== false) {
      observer.fetchOptimistic(defaultedOptions).then(listener).catch((error) => listener({ error }));
    }
    dataAtom.onMount = (update) => {
      setData = update;
      const unsubscribe = observer == null ? void 0 : observer.subscribe(listener);
      if (options.enabled === false) {
        if (settlePromise) {
          settlePromise(void 0);
        } else {
          setData(void 0);
        }
      }
      return unsubscribe;
    };
    return { dataAtom, observer, options };
  }, (get, _set, action) => {
    const { observer } = get(queryDataAtom);
    switch (action.type) {
      case "refetch": {
        const _a = action, options = __objRest(_a, ["type"]);
        void observer.refetch(options);
        break;
      }
      case "fetchPreviousPage": {
        void observer.fetchPreviousPage();
        break;
      }
      case "fetchNextPage": {
        void observer.fetchNextPage();
        break;
      }
    }
  });
  const queryAtom = atom((get) => {
    const { dataAtom } = get(queryDataAtom);
    return get(dataAtom);
  }, (_get, set, action) => {
    set(queryDataAtom, action);
  });
  return queryAtom;
}

export { atomWithInfiniteQuery, atomWithQuery, queryClientAtom };
