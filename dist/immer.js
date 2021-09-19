'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var immer = require('immer');
var jotai = require('jotai');
var react = require('react');

function atomWithImmer(initialValue) {
  var anAtom = jotai.atom(initialValue, function (get, set, fn) {
    return set(anAtom, immer.produce(get(anAtom), typeof fn === 'function' ? fn : function () {
      return fn;
    }));
  });
  return anAtom;
}

function useImmerAtom(anAtom, scope) {
  var _useAtom = jotai.useAtom(anAtom, scope),
      state = _useAtom[0],
      setState = _useAtom[1];

  var setStateWithImmer = react.useCallback(function (fn) {
    setState(immer.produce(function (draft) {
      return fn(draft);
    }));
  }, [setState]);
  return [state, setStateWithImmer];
}

var getWeakCacheItem = function getWeakCacheItem(cache, deps) {
  while (true) {
    var _deps = deps,
        dep = _deps[0],
        rest = _deps.slice(1);

    var entry = cache.get(dep);

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

var setWeakCacheItem = function setWeakCacheItem(cache, deps, item) {
  while (true) {
    var _deps2 = deps,
        dep = _deps2[0],
        rest = _deps2.slice(1);

    var entry = cache.get(dep);

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

var createMemoizeAtom = function createMemoizeAtom() {
  var cache = new WeakMap();

  var memoizeAtom = function memoizeAtom(createAtom, deps) {
    var cachedAtom = getWeakCacheItem(cache, deps);

    if (cachedAtom) {
      return cachedAtom;
    }

    var createdAtom = createAtom();
    setWeakCacheItem(cache, deps, createdAtom);
    return createdAtom;
  };

  return memoizeAtom;
};

var memoizeAtom = createMemoizeAtom();
function withImmer(anAtom) {
  return memoizeAtom(function () {
    var derivedAtom = jotai.atom(function (get) {
      return get(anAtom);
    }, function (get, set, fn) {
      return set(anAtom, immer.produce(get(anAtom), typeof fn === 'function' ? fn : function () {
        return fn;
      }));
    });
    return derivedAtom;
  }, [anAtom]);
}

exports.atomWithImmer = atomWithImmer;
exports.useImmerAtom = useImmerAtom;
exports.withImmer = withImmer;
