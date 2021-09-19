import * as O from 'optics-ts';
import { atom } from 'jotai';

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

const memoizeAtom = createMemoizeAtom();
const isFunction = (x) => typeof x === "function";
function focusAtom(baseAtom, callback) {
  return memoizeAtom(() => {
    const focus = callback(O.optic());
    const derivedAtom = atom((get) => getValueUsingOptic(focus, get(baseAtom)), (get, set, update) => {
      const newValueProducer = isFunction(update) ? O.modify(focus)(update) : O.set(focus)(update);
      set(baseAtom, newValueProducer(get(baseAtom)));
    });
    return derivedAtom;
  }, [baseAtom, callback]);
}
const getValueUsingOptic = (focus, bigValue) => {
  if (focus._tag === "Traversal") {
    const values = O.collect(focus)(bigValue);
    return values;
  }
  if (focus._tag === "Prism") {
    const value2 = O.preview(focus)(bigValue);
    return value2;
  }
  const value = O.get(focus)(bigValue);
  return value;
};

export { focusAtom };
