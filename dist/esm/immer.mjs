import { produce } from 'immer';
import { atom, useAtom } from 'jotai';
import { useCallback } from 'react';

function atomWithImmer(initialValue) {
  const anAtom = atom(initialValue, (get, set, fn) => set(anAtom, produce(get(anAtom), typeof fn === "function" ? fn : () => fn)));
  return anAtom;
}

function useImmerAtom(anAtom, scope) {
  const [state, setState] = useAtom(anAtom, scope);
  const setStateWithImmer = useCallback((fn) => {
    setState(produce((draft) => fn(draft)));
  }, [setState]);
  return [state, setStateWithImmer];
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

const memoizeAtom = createMemoizeAtom();
function withImmer(anAtom) {
  return memoizeAtom(() => {
    const derivedAtom = atom((get) => get(anAtom), (get, set, fn) => set(anAtom, produce(get(anAtom), typeof fn === "function" ? fn : () => fn)));
    return derivedAtom;
  }, [anAtom]);
}

export { atomWithImmer, useImmerAtom, withImmer };
