'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var jotai = require('jotai');

function atomWithStore(store) {
  var baseAtom = jotai.atom(store.getState());

  baseAtom.onMount = function (setValue) {
    var callback = function callback() {
      setValue(store.getState());
    };

    var unsub = store.subscribe(callback);
    callback();
    return unsub;
  };

  var derivedAtom = jotai.atom(function (get) {
    return get(baseAtom);
  }, function (_get, _set, action) {
    store.dispatch(action);
  });
  return derivedAtom;
}

exports.atomWithStore = atomWithStore;
