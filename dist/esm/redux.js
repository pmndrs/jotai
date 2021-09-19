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
  const derivedAtom = atom((get) => get(baseAtom), (_get, _set, action) => {
    store.dispatch(action);
  });
  return derivedAtom;
}

export { atomWithStore };
