'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var O = require('optics-ts');
var jotai = require('jotai');

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () {
            return e[k];
          }
        });
      }
    });
  }
  n['default'] = e;
  return Object.freeze(n);
}

var O__namespace = /*#__PURE__*/_interopNamespace(O);

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

var isFunction = function isFunction(x) {
  return typeof x === 'function';
};

function focusAtom(baseAtom, callback) {
  return memoizeAtom(function () {
    var focus = callback(O__namespace.optic());
    var derivedAtom = jotai.atom(function (get) {
      return getValueUsingOptic(focus, get(baseAtom));
    }, function (get, set, update) {
      var newValueProducer = isFunction(update) ? O__namespace.modify(focus)(update) : O__namespace.set(focus)(update);
      set(baseAtom, newValueProducer(get(baseAtom)));
    });
    return derivedAtom;
  }, [baseAtom, callback]);
}

var getValueUsingOptic = function getValueUsingOptic(focus, bigValue) {
  if (focus._tag === 'Traversal') {
    var values = O__namespace.collect(focus)(bigValue);
    return values;
  }

  if (focus._tag === 'Prism') {
    var _value = O__namespace.preview(focus)(bigValue);

    return _value;
  }

  var value = O__namespace.get(focus)(bigValue);
  return value;
};

exports.focusAtom = focusAtom;
