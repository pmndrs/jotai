import { atom } from "jotai";

export const clockAtom = atom({
  light: false,
  lastUpdate: 0
});

export const hydrateAtom = atom(null, (get, set, initialState) => {
  if (initialState) {
    set(clockAtom, initialState);
  }
});
