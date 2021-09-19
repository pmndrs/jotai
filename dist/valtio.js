'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vanilla = require('valtio/vanilla');
var jotai = require('jotai');

var isObject = function isObject(x) {
  return typeof x === 'object' && x !== null;
};

var applyChanges = function applyChanges(proxyObject, prev, next) {
  Object.keys(prev).forEach(function (key) {
    if (!(key in next)) {
      delete proxyObject[key];
    } else if (Object.is(prev[key], next[key])) ; else if (isObject(proxyObject[key]) && isObject(prev[key]) && isObject(next[key])) {
      applyChanges(proxyObject[key], prev[key], next[key]);
    } else {
      proxyObject[key] = next[key];
    }
  });
  Object.keys(next).forEach(function (key) {
    if (!(key in prev)) {
      proxyObject[key] = next[key];
    }
  });
};

function atomWithProxy(proxyObject) {
  var baseAtom = jotai.atom(vanilla.snapshot(proxyObject));

  baseAtom.onMount = function (setValue) {
    var callback = function callback() {
      setValue(vanilla.snapshot(proxyObject));
    };

    var unsub = vanilla.subscribe(proxyObject, callback);
    callback();
    return unsub;
  };

  var derivedAtom = jotai.atom(function (get) {
    return get(baseAtom);
  }, function (get, _set, update) {
    var newValue = typeof update === 'function' ? update(get(baseAtom)) : update;
    applyChanges(proxyObject, vanilla.snapshot(proxyObject), newValue);
  });
  return derivedAtom;
}

exports.atomWithProxy = atomWithProxy;
