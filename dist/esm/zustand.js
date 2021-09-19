import { atom } from 'jotai';

function atomWithStore(store) {
  const baseAtom = atom(store.getState());
  baseAtom.onMount = (setValue) => {
    const callback = () => {
      setValue(store.getState());
    };
    const unsub = store.subscribe(callback);
    callback();
    return unsub;
  };
  const derivedAtom = atom((get) => get(baseAtom), (get, _set, update) => {
    const newState = typeof update === "function" ? update(get(baseAtom)) : update;
    store.setState(newState, true);
  });
  return derivedAtom;
}

export { atomWithStore };
