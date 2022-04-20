import { atom, useAtom } from "jotai";

export function atomWithBroadcast<Value>(key: string, initialValue: Value) {
  const channel = new BroadcastChannel(key);


  const baseAtom = atom(initialValue);

  const broadcastAtom = atom<Value, { fromOnMessage: boolean; value: Value }>(
    (get) => get(baseAtom),
    (get, set, update) => {
      if (!update.fromOnMessage) {
        channel.postMessage(update.value);
      }
      set(baseAtom, update.value);
    }
  );
  broadcastAtom.onMount = (setAtom) => {
    channel.onmessage = (event) => {
      setAtom({ fromOnMessage: true, value: event.data });
    };
  };
  const returnedAtom = atom<Value, Value>(
    (get) => get(broadcastAtom),
    (get, set, update) => {
      set(broadcastAtom, { fromOnMessage: false, value: update });
    }
  );
  return returnedAtom;
}