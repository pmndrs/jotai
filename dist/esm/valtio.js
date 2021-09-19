import { snapshot, subscribe } from 'valtio/vanilla';
import { atom } from 'jotai';

const isObject = (x) => typeof x === "object" && x !== null;
const applyChanges = (proxyObject, prev, next) => {
  Object.keys(prev).forEach((key) => {
    if (!(key in next)) {
      delete proxyObject[key];
    } else if (Object.is(prev[key], next[key])) ; else if (isObject(proxyObject[key]) && isObject(prev[key]) && isObject(next[key])) {
      applyChanges(proxyObject[key], prev[key], next[key]);
    } else {
      proxyObject[key] = next[key];
    }
  });
  Object.keys(next).forEach((key) => {
    if (!(key in prev)) {
      proxyObject[key] = next[key];
    }
  });
};
function atomWithProxy(proxyObject) {
  const baseAtom = atom(snapshot(proxyObject));
  baseAtom.onMount = (setValue) => {
    const callback = () => {
      setValue(snapshot(proxyObject));
    };
    const unsub = subscribe(proxyObject, callback);
    callback();
    return unsub;
  };
  const derivedAtom = atom((get) => get(baseAtom), (get, _set, update) => {
    const newValue = typeof update === "function" ? update(get(baseAtom)) : update;
    applyChanges(proxyObject, snapshot(proxyObject), newValue);
  });
  return derivedAtom;
}

export { atomWithProxy };
