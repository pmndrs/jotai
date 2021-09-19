import { useContext, useCallback, useMemo } from 'react';
import { SECRET_INTERNAL_getScopeContext, useAtom, atom } from 'jotai';

const RESET = Symbol();

const WRITE_ATOM = "w";
const RESTORE_ATOMS = "h";

function useUpdateAtom(anAtom, scope) {
  const ScopeContext = SECRET_INTERNAL_getScopeContext(scope);
  const store = useContext(ScopeContext)[0];
  const setAtom = useCallback((update) => store[WRITE_ATOM](anAtom, update), [store, anAtom]);
  return setAtom;
}

function useAtomValue(anAtom, scope) {
  return useAtom(anAtom, scope)[0];
}

function atomWithReset(initialValue) {
  const anAtom = atom(initialValue, (get, set, update) => {
    if (update === RESET) {
      set(anAtom, initialValue);
    } else {
      set(anAtom, typeof update === "function" ? update(get(anAtom)) : update);
    }
  });
  return anAtom;
}

function useResetAtom(anAtom, scope) {
  const ScopeContext = SECRET_INTERNAL_getScopeContext(scope);
  const store = useContext(ScopeContext)[0];
  const setAtom = useCallback(() => store[WRITE_ATOM](anAtom, RESET), [store, anAtom]);
  return setAtom;
}

function useReducerAtom(anAtom, reducer, scope) {
  const [state, setState] = useAtom(anAtom, scope);
  const dispatch = useCallback((action) => {
    setState((prev) => reducer(prev, action));
  }, [setState, reducer]);
  return [state, dispatch];
}

function atomWithReducer(initialValue, reducer) {
  const anAtom = atom(initialValue, (get, set, action) => set(anAtom, reducer(get(anAtom), action)));
  return anAtom;
}

function atomFamily(initializeAtom, areEqual) {
  let shouldRemove = null;
  const atoms = new Map();
  const createAtom = (param) => {
    let item;
    if (areEqual === void 0) {
      item = atoms.get(param);
    } else {
      for (let [key, value] of atoms) {
        if (areEqual(key, param)) {
          item = value;
          break;
        }
      }
    }
    if (item !== void 0) {
      if (shouldRemove?.(item[1], param)) {
        atoms.delete(param);
      } else {
        return item[0];
      }
    }
    const newAtom = initializeAtom(param);
    atoms.set(param, [newAtom, Date.now()]);
    return newAtom;
  };
  createAtom.remove = (param) => {
    if (areEqual === void 0) {
      atoms.delete(param);
    } else {
      for (let [key] of atoms) {
        if (areEqual(key, param)) {
          atoms.delete(key);
          break;
        }
      }
    }
  };
  createAtom.setShouldRemove = (fn) => {
    shouldRemove = fn;
    if (!shouldRemove)
      return;
    for (let [key, value] of atoms) {
      if (shouldRemove(value[1], key)) {
        atoms.delete(key);
      }
    }
  };
  return createAtom;
}

const getWeakCacheItem = (cache, deps) => {
  while (true) {
    const [dep, ...rest] = deps;
    const entry = cache.get(dep);
    if (!entry) {
      return;
    }
    if (!rest.length) {
      return entry[1];
    }
    cache = entry[0];
    deps = rest;
  }
};
const setWeakCacheItem = (cache, deps, item) => {
  while (true) {
    const [dep, ...rest] = deps;
    let entry = cache.get(dep);
    if (!entry) {
      entry = [new WeakMap()];
      cache.set(dep, entry);
    }
    if (!rest.length) {
      entry[1] = item;
      return;
    }
    cache = entry[0];
    deps = rest;
  }
};
const createMemoizeAtom = () => {
  const cache = new WeakMap();
  const memoizeAtom = (createAtom, deps) => {
    const cachedAtom = getWeakCacheItem(cache, deps);
    if (cachedAtom) {
      return cachedAtom;
    }
    const createdAtom = createAtom();
    setWeakCacheItem(cache, deps, createdAtom);
    return createdAtom;
  };
  return memoizeAtom;
};

const memoizeAtom$4 = createMemoizeAtom();
function selectAtom(anAtom, selector, equalityFn = Object.is) {
  return memoizeAtom$4(() => {
    const refAtom = atom(() => ({}));
    const derivedAtom = atom((get) => {
      const slice = selector(get(anAtom));
      const ref = get(refAtom);
      if ("prev" in ref && equalityFn(ref.prev, slice)) {
        return ref.prev;
      }
      ref.prev = slice;
      return slice;
    });
    return derivedAtom;
  }, [anAtom, selector, equalityFn]);
}

function useAtomCallback(callback, scope) {
  const anAtom = useMemo(() => atom(null, (get, set, [arg, resolve, reject]) => {
    try {
      resolve(callback(get, set, arg));
    } catch (e) {
      reject(e);
    }
  }), [callback]);
  const invoke = useUpdateAtom(anAtom, scope);
  return useCallback((arg) => new Promise((resolve, reject) => {
    invoke([arg, resolve, reject]);
  }), [invoke]);
}

const memoizeAtom$3 = createMemoizeAtom();
const deepFreeze = (obj) => {
  if (typeof obj !== "object" || obj === null)
    return;
  Object.freeze(obj);
  const propNames = Object.getOwnPropertyNames(obj);
  for (const name of propNames) {
    const value = obj[name];
    deepFreeze(value);
  }
  return obj;
};
function freezeAtom(anAtom) {
  return memoizeAtom$3(() => {
    const frozenAtom = atom((get) => deepFreeze(get(anAtom)), (_get, set, arg) => set(anAtom, arg));
    return frozenAtom;
  }, [anAtom]);
}
function freezeAtomCreator(createAtom) {
  return (...params) => {
    const anAtom = createAtom(...params);
    const origRead = anAtom.read;
    anAtom.read = (get) => deepFreeze(origRead(get));
    return anAtom;
  };
}

const memoizeAtom$2 = createMemoizeAtom();
const isWritable = (atom2) => !!atom2.write;
const isFunction = (x) => typeof x === "function";
function splitAtom(arrAtom, keyExtractor) {
  return memoizeAtom$2(() => {
    const refAtom = atom(() => ({}));
    const read = (get) => {
      const ref = get(refAtom);
      let nextAtomList = [];
      let nextKeyList = [];
      get(arrAtom).forEach((item, index) => {
        const key = keyExtractor ? keyExtractor(item) : index;
        nextKeyList[index] = key;
        const cachedAtom = ref.atomList?.[ref.keyList?.indexOf(key) ?? -1];
        if (cachedAtom) {
          nextAtomList[index] = cachedAtom;
          return;
        }
        const read2 = (get2) => {
          const index2 = ref.keyList?.indexOf(key) ?? -1;
          if (index2 === -1 && typeof process === "object" && process.env.NODE_ENV !== "production") {
            console.warn("splitAtom: array index out of bounds, returning undefined", atom);
          }
          return get2(arrAtom)[index2];
        };
        const write2 = (get2, set, update) => {
          const index2 = ref.keyList?.indexOf(key) ?? -1;
          if (index2 === -1) {
            throw new Error("splitAtom: array index not found");
          }
          const prev = get2(arrAtom);
          const nextItem = isFunction(update) ? update(prev[index2]) : update;
          set(arrAtom, [
            ...prev.slice(0, index2),
            nextItem,
            ...prev.slice(index2 + 1)
          ]);
        };
        const itemAtom = isWritable(arrAtom) ? atom(read2, write2) : atom(read2);
        nextAtomList[index] = itemAtom;
      });
      ref.keyList = nextKeyList;
      if (ref.atomList && ref.atomList.length === nextAtomList.length && ref.atomList.every((x, i) => x === nextAtomList[i])) {
        return ref.atomList;
      }
      return ref.atomList = nextAtomList;
    };
    const write = (get, set, atomToRemove) => {
      const index = get(splittedAtom).indexOf(atomToRemove);
      if (index >= 0) {
        const prev = get(arrAtom);
        set(arrAtom, [
          ...prev.slice(0, index),
          ...prev.slice(index + 1)
        ]);
      }
    };
    const splittedAtom = isWritable(arrAtom) ? atom(read, write) : atom(read);
    return splittedAtom;
  }, keyExtractor ? [arrAtom, keyExtractor] : [arrAtom]);
}

function atomWithDefault(getDefault) {
  const EMPTY = Symbol();
  const overwrittenAtom = atom(EMPTY);
  const anAtom = atom((get) => {
    const overwritten = get(overwrittenAtom);
    if (overwritten !== EMPTY) {
      return overwritten;
    }
    return getDefault(get);
  }, (get, set, update) => {
    if (update === RESET) {
      set(overwrittenAtom, EMPTY);
    } else {
      set(overwrittenAtom, typeof update === "function" ? update(get(anAtom)) : update);
    }
  });
  return anAtom;
}

const memoizeAtom$1 = createMemoizeAtom();
function waitForAll(atoms) {
  const createAtom = () => {
    const unwrappedAtoms = unwrapAtoms(atoms);
    const derivedAtom = atom((get) => {
      const promises = [];
      const values = unwrappedAtoms.map((anAtom, index) => {
        try {
          return get(anAtom);
        } catch (e) {
          if (e instanceof Promise) {
            promises[index] = e;
          } else {
            throw e;
          }
        }
      });
      if (promises.length) {
        throw Promise.all(promises);
      }
      return wrapResults(atoms, values);
    });
    return derivedAtom;
  };
  if (Array.isArray(atoms)) {
    return memoizeAtom$1(createAtom, atoms);
  }
  return createAtom();
}
const unwrapAtoms = (atoms) => Array.isArray(atoms) ? atoms : Object.getOwnPropertyNames(atoms).map((key) => atoms[key]);
const wrapResults = (atoms, results) => Array.isArray(atoms) ? results : Object.getOwnPropertyNames(atoms).reduce((out, key, idx) => ({ ...out, [key]: results[idx] }), {});

const createJSONStorage = (getStringStorage) => ({
  getItem: (key) => {
    const value = getStringStorage().getItem(key);
    if (value instanceof Promise) {
      return value.then((v) => JSON.parse(v || ""));
    }
    return JSON.parse(value || "");
  },
  setItem: (key, newValue) => {
    getStringStorage().setItem(key, JSON.stringify(newValue));
  }
});
const defaultStorage = createJSONStorage(() => localStorage);
function atomWithStorage(key, initialValue, storage = defaultStorage) {
  const getInitialValue = () => {
    try {
      const value = storage.getItem(key);
      if (value instanceof Promise) {
        return value.catch(() => initialValue);
      }
      return value;
    } catch {
      return initialValue;
    }
  };
  const baseAtom = atom(storage.delayInit ? initialValue : getInitialValue());
  baseAtom.onMount = (setAtom) => {
    let unsub;
    if (storage.subscribe) {
      unsub = storage.subscribe(key, setAtom);
    }
    if (storage.delayInit) {
      const value = getInitialValue();
      if (value instanceof Promise) {
        value.then(setAtom);
      } else {
        setAtom(value);
      }
    }
    return unsub;
  };
  const anAtom = atom((get) => get(baseAtom), (get, set, update) => {
    const newValue = typeof update === "function" ? update(get(baseAtom)) : update;
    set(baseAtom, newValue);
    storage.setItem(key, newValue);
  });
  return anAtom;
}
function atomWithHash(key, initialValue, serialize = JSON.stringify, deserialize = JSON.parse) {
  const hashStorage = {
    getItem: (key2) => {
      const searchParams = new URLSearchParams(location.hash.slice(1));
      const storedValue = searchParams.get(key2);
      if (storedValue === null) {
        throw new Error("no value stored");
      }
      return deserialize(storedValue);
    },
    setItem: (key2, newValue) => {
      const searchParams = new URLSearchParams(location.hash.slice(1));
      searchParams.set(key2, serialize(newValue));
      location.hash = searchParams.toString();
    },
    delayInit: true,
    subscribe: (key2, setValue) => {
      const callback = () => {
        const searchParams = new URLSearchParams(location.hash.slice(1));
        const str = searchParams.get(key2);
        if (str !== null) {
          setValue(deserialize(str));
        }
      };
      window.addEventListener("hashchange", callback);
      return () => {
        window.removeEventListener("hashchange", callback);
      };
    }
  };
  return atomWithStorage(key, initialValue, hashStorage);
}

function atomWithObservable(createObservable) {
  const observableResultAtom = atom((get) => {
    let settlePromise = null;
    let observable = createObservable(get);
    const returnsItself = observable[Symbol.observable];
    if (returnsItself) {
      observable = returnsItself();
    }
    const dataAtom = atom(new Promise((resolve, reject) => {
      settlePromise = (data, err) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      };
    }));
    let setData = () => {
      throw new Error("setting data without mount");
    };
    const dataListener = (data) => {
      if (settlePromise) {
        settlePromise(data);
        settlePromise = null;
        if (subscription && !setData) {
          subscription.unsubscribe();
          subscription = null;
        }
      } else {
        setData(data);
      }
    };
    const errorListener = (error) => {
      if (settlePromise) {
        settlePromise(null, error);
        settlePromise = null;
        if (subscription && !setData) {
          subscription.unsubscribe();
          subscription = null;
        }
      } else {
        setData(Promise.reject(error));
      }
    };
    let subscription = null;
    subscription = observable.subscribe(dataListener, errorListener);
    if (!settlePromise) {
      subscription.unsubscribe();
      subscription = null;
    }
    dataAtom.onMount = (update) => {
      setData = update;
      if (!subscription) {
        subscription = observable.subscribe(dataListener, errorListener);
      }
      return () => subscription?.unsubscribe();
    };
    return { dataAtom, observable };
  });
  const observableAtom = atom((get) => {
    const { dataAtom } = get(observableResultAtom);
    return get(dataAtom);
  }, (get, _set, data) => {
    const { observable } = get(observableResultAtom);
    if ("next" in observable) {
      observable.next(data);
    } else {
      throw new Error("observable is not subject");
    }
  });
  return observableAtom;
}

const hydratedMap = new WeakMap();
function useHydrateAtoms(values, scope) {
  const ScopeContext = SECRET_INTERNAL_getScopeContext(scope);
  const scopeContainer = useContext(ScopeContext);
  const store = scopeContainer[0];
  const hydratedSet = getHydratedSet(scopeContainer);
  const tuplesToRestore = [];
  for (const tuple of values) {
    const atom = tuple[0];
    if (!hydratedSet.has(atom)) {
      hydratedSet.add(atom);
      tuplesToRestore.push(tuple);
    }
  }
  if (tuplesToRestore.length) {
    store[RESTORE_ATOMS](tuplesToRestore);
  }
}
function getHydratedSet(scopeContainer) {
  let hydratedSet = hydratedMap.get(scopeContainer);
  if (!hydratedSet) {
    hydratedSet = new WeakSet();
    hydratedMap.set(scopeContainer, hydratedSet);
  }
  return hydratedSet;
}

const memoizeAtom = createMemoizeAtom();
const errorLoadableCache = new WeakMap();
const LOADING_LOADABLE = { state: "loading" };
function loadable(anAtom) {
  return memoizeAtom(() => {
    const derivedAtom = atom((get) => {
      try {
        const value = get(anAtom);
        return {
          state: "hasData",
          data: value
        };
      } catch (error) {
        if (error instanceof Promise) {
          return LOADING_LOADABLE;
        }
        const cachedErrorLoadable = errorLoadableCache.get(error);
        if (cachedErrorLoadable) {
          return cachedErrorLoadable;
        }
        const errorLoadable = {
          state: "hasError",
          error
        };
        errorLoadableCache.set(error, errorLoadable);
        return errorLoadable;
      }
    });
    return derivedAtom;
  }, [anAtom]);
}

export { RESET, atomFamily, atomWithDefault, atomWithHash, atomWithObservable, atomWithReducer, atomWithReset, atomWithStorage, createJSONStorage, freezeAtom, freezeAtomCreator, loadable, selectAtom, splitAtom, useAtomCallback, useAtomValue, useHydrateAtoms, useReducerAtom, useResetAtom, useUpdateAtom, waitForAll };
