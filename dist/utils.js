'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var react = require('react');
var jotai = require('jotai');

var RESET = Symbol();

function _extends() {
  _extends = Object.assign || function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];

      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    return target;
  };

  return _extends.apply(this, arguments);
}

function _unsupportedIterableToArray(o, minLen) {
  if (!o) return;
  if (typeof o === "string") return _arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === "Object" && o.constructor) n = o.constructor.name;
  if (n === "Map" || n === "Set") return Array.from(o);
  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
}

function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length;

  for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];

  return arr2;
}

function _createForOfIteratorHelperLoose(o, allowArrayLike) {
  var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"];
  if (it) return (it = it.call(o)).next.bind(it);

  if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") {
    if (it) o = it;
    var i = 0;
    return function () {
      if (i >= o.length) return {
        done: true
      };
      return {
        done: false,
        value: o[i++]
      };
    };
  }

  throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}

var WRITE_ATOM = 'w';
var RESTORE_ATOMS = 'h';

function useUpdateAtom(anAtom, scope) {
  var ScopeContext = jotai.SECRET_INTERNAL_getScopeContext(scope);
  var store = react.useContext(ScopeContext)[0];
  var setAtom = react.useCallback(function (update) {
    return store[WRITE_ATOM](anAtom, update);
  }, [store, anAtom]);
  return setAtom;
}

function useAtomValue(anAtom, scope) {
  return jotai.useAtom(anAtom, scope)[0];
}

function atomWithReset(initialValue) {
  var anAtom = jotai.atom(initialValue, function (get, set, update) {
    if (update === RESET) {
      set(anAtom, initialValue);
    } else {
      set(anAtom, typeof update === 'function' ? update(get(anAtom)) : update);
    }
  });
  return anAtom;
}

function useResetAtom(anAtom, scope) {
  var ScopeContext = jotai.SECRET_INTERNAL_getScopeContext(scope);
  var store = react.useContext(ScopeContext)[0];
  var setAtom = react.useCallback(function () {
    return store[WRITE_ATOM](anAtom, RESET);
  }, [store, anAtom]);
  return setAtom;
}

function useReducerAtom(anAtom, reducer, scope) {
  var _useAtom = jotai.useAtom(anAtom, scope),
      state = _useAtom[0],
      setState = _useAtom[1];

  var dispatch = react.useCallback(function (action) {
    setState(function (prev) {
      return reducer(prev, action);
    });
  }, [setState, reducer]);
  return [state, dispatch];
}

function atomWithReducer(initialValue, reducer) {
  var anAtom = jotai.atom(initialValue, function (get, set, action) {
    return set(anAtom, reducer(get(anAtom), action));
  });
  return anAtom;
}

function atomFamily(initializeAtom, areEqual) {
  var shouldRemove = null;
  var atoms = new Map();

  var createAtom = function createAtom(param) {
    var item;

    if (areEqual === undefined) {
      item = atoms.get(param);
    } else {
      for (var _iterator = _createForOfIteratorHelperLoose(atoms), _step; !(_step = _iterator()).done;) {
        var _step$value = _step.value,
            key = _step$value[0],
            value = _step$value[1];

        if (areEqual(key, param)) {
          item = value;
          break;
        }
      }
    }

    if (item !== undefined) {
      if (shouldRemove != null && shouldRemove(item[1], param)) {
        atoms.delete(param);
      } else {
        return item[0];
      }
    }

    var newAtom = initializeAtom(param);
    atoms.set(param, [newAtom, Date.now()]);
    return newAtom;
  };

  createAtom.remove = function (param) {
    if (areEqual === undefined) {
      atoms.delete(param);
    } else {
      for (var _iterator2 = _createForOfIteratorHelperLoose(atoms), _step2; !(_step2 = _iterator2()).done;) {
        var _step2$value = _step2.value,
            key = _step2$value[0];

        if (areEqual(key, param)) {
          atoms.delete(key);
          break;
        }
      }
    }
  };

  createAtom.setShouldRemove = function (fn) {
    shouldRemove = fn;
    if (!shouldRemove) return;

    for (var _iterator3 = _createForOfIteratorHelperLoose(atoms), _step3; !(_step3 = _iterator3()).done;) {
      var _step3$value = _step3.value,
          key = _step3$value[0],
          value = _step3$value[1];

      if (shouldRemove(value[1], key)) {
        atoms.delete(key);
      }
    }
  };

  return createAtom;
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

var memoizeAtom$4 = createMemoizeAtom();
function selectAtom(anAtom, selector, equalityFn) {
  if (equalityFn === void 0) {
    equalityFn = Object.is;
  }

  return memoizeAtom$4(function () {
    var refAtom = jotai.atom(function () {
      return {};
    });
    var derivedAtom = jotai.atom(function (get) {
      var slice = selector(get(anAtom));
      var ref = get(refAtom);

      if ('prev' in ref && equalityFn(ref.prev, slice)) {
        return ref.prev;
      }

      ref.prev = slice;
      return slice;
    });
    return derivedAtom;
  }, [anAtom, selector, equalityFn]);
}

function useAtomCallback(callback, scope) {
  var anAtom = react.useMemo(function () {
    return jotai.atom(null, function (get, set, _ref) {
      var arg = _ref[0],
          resolve = _ref[1],
          reject = _ref[2];

      try {
        resolve(callback(get, set, arg));
      } catch (e) {
        reject(e);
      }
    });
  }, [callback]);
  var invoke = useUpdateAtom(anAtom, scope);
  return react.useCallback(function (arg) {
    return new Promise(function (resolve, reject) {
      invoke([arg, resolve, reject]);
    });
  }, [invoke]);
}

var memoizeAtom$3 = createMemoizeAtom();

var deepFreeze = function deepFreeze(obj) {
  if (typeof obj !== 'object' || obj === null) return;
  Object.freeze(obj);
  var propNames = Object.getOwnPropertyNames(obj);

  for (var _iterator = _createForOfIteratorHelperLoose(propNames), _step; !(_step = _iterator()).done;) {
    var name = _step.value;
    var value = obj[name];
    deepFreeze(value);
  }

  return obj;
};

function freezeAtom(anAtom) {
  return memoizeAtom$3(function () {
    var frozenAtom = jotai.atom(function (get) {
      return deepFreeze(get(anAtom));
    }, function (_get, set, arg) {
      return set(anAtom, arg);
    });
    return frozenAtom;
  }, [anAtom]);
}
function freezeAtomCreator(createAtom) {
  return function () {
    var anAtom = createAtom.apply(void 0, arguments);
    var origRead = anAtom.read;

    anAtom.read = function (get) {
      return deepFreeze(origRead(get));
    };

    return anAtom;
  };
}

var memoizeAtom$2 = createMemoizeAtom();

var isWritable = function isWritable(atom) {
  return !!atom.write;
};

var isFunction = function isFunction(x) {
  return typeof x === 'function';
};

function splitAtom(arrAtom, keyExtractor) {
  return memoizeAtom$2(function () {
    var refAtom = jotai.atom(function () {
      return {};
    });

    var read = function read(get) {
      var ref = get(refAtom);
      var nextAtomList = [];
      var nextKeyList = [];
      get(arrAtom).forEach(function (item, index) {
        var _ref$atomList, _ref$keyList$indexOf, _ref$keyList;

        var key = keyExtractor ? keyExtractor(item) : index;
        nextKeyList[index] = key;
        var cachedAtom = (_ref$atomList = ref.atomList) == null ? void 0 : _ref$atomList[(_ref$keyList$indexOf = (_ref$keyList = ref.keyList) == null ? void 0 : _ref$keyList.indexOf(key)) != null ? _ref$keyList$indexOf : -1];

        if (cachedAtom) {
          nextAtomList[index] = cachedAtom;
          return;
        }

        var read = function read(get) {
          var _ref$keyList$indexOf2, _ref$keyList2;

          var index = (_ref$keyList$indexOf2 = (_ref$keyList2 = ref.keyList) == null ? void 0 : _ref$keyList2.indexOf(key)) != null ? _ref$keyList$indexOf2 : -1;

          if (index === -1 && typeof process === 'object' && process.env.NODE_ENV !== 'production') {
            console.warn('splitAtom: array index out of bounds, returning undefined', jotai.atom);
          }

          return get(arrAtom)[index];
        };

        var write = function write(get, set, update) {
          var _ref$keyList$indexOf3, _ref$keyList3;

          var index = (_ref$keyList$indexOf3 = (_ref$keyList3 = ref.keyList) == null ? void 0 : _ref$keyList3.indexOf(key)) != null ? _ref$keyList$indexOf3 : -1;

          if (index === -1) {
            throw new Error('splitAtom: array index not found');
          }

          var prev = get(arrAtom);
          var nextItem = isFunction(update) ? update(prev[index]) : update;
          set(arrAtom, [].concat(prev.slice(0, index), [nextItem], prev.slice(index + 1)));
        };

        var itemAtom = isWritable(arrAtom) ? jotai.atom(read, write) : jotai.atom(read);
        nextAtomList[index] = itemAtom;
      });
      ref.keyList = nextKeyList;

      if (ref.atomList && ref.atomList.length === nextAtomList.length && ref.atomList.every(function (x, i) {
        return x === nextAtomList[i];
      })) {
        return ref.atomList;
      }

      return ref.atomList = nextAtomList;
    };

    var write = function write(get, set, atomToRemove) {
      var index = get(splittedAtom).indexOf(atomToRemove);

      if (index >= 0) {
        var prev = get(arrAtom);
        set(arrAtom, [].concat(prev.slice(0, index), prev.slice(index + 1)));
      }
    };

    var splittedAtom = isWritable(arrAtom) ? jotai.atom(read, write) : jotai.atom(read);
    return splittedAtom;
  }, keyExtractor ? [arrAtom, keyExtractor] : [arrAtom]);
}

function atomWithDefault(getDefault) {
  var EMPTY = Symbol();
  var overwrittenAtom = jotai.atom(EMPTY);
  var anAtom = jotai.atom(function (get) {
    var overwritten = get(overwrittenAtom);

    if (overwritten !== EMPTY) {
      return overwritten;
    }

    return getDefault(get);
  }, function (get, set, update) {
    if (update === RESET) {
      set(overwrittenAtom, EMPTY);
    } else {
      set(overwrittenAtom, typeof update === 'function' ? update(get(anAtom)) : update);
    }
  });
  return anAtom;
}

var memoizeAtom$1 = createMemoizeAtom();
function waitForAll(atoms) {
  var createAtom = function createAtom() {
    var unwrappedAtoms = unwrapAtoms(atoms);
    var derivedAtom = jotai.atom(function (get) {
      var promises = [];
      var values = unwrappedAtoms.map(function (anAtom, index) {
        try {
          return get(anAtom);
        } catch (e) {
          if (e instanceof Promise) {
            promises[index] = e;
          } else {
            throw e;
          }
        }
      });

      if (promises.length) {
        throw Promise.all(promises);
      }

      return wrapResults(atoms, values);
    });
    return derivedAtom;
  };

  if (Array.isArray(atoms)) {
    return memoizeAtom$1(createAtom, atoms);
  }

  return createAtom();
}

var unwrapAtoms = function unwrapAtoms(atoms) {
  return Array.isArray(atoms) ? atoms : Object.getOwnPropertyNames(atoms).map(function (key) {
    return atoms[key];
  });
};

var wrapResults = function wrapResults(atoms, results) {
  return Array.isArray(atoms) ? results : Object.getOwnPropertyNames(atoms).reduce(function (out, key, idx) {
    var _extends2;

    return _extends({}, out, (_extends2 = {}, _extends2[key] = results[idx], _extends2));
  }, {});
};

var createJSONStorage = function createJSONStorage(getStringStorage) {
  return {
    getItem: function getItem(key) {
      var value = getStringStorage().getItem(key);

      if (value instanceof Promise) {
        return value.then(function (v) {
          return JSON.parse(v || '');
        });
      }

      return JSON.parse(value || '');
    },
    setItem: function setItem(key, newValue) {
      getStringStorage().setItem(key, JSON.stringify(newValue));
    }
  };
};
var defaultStorage = createJSONStorage(function () {
  return localStorage;
});
function atomWithStorage(key, initialValue, storage) {
  if (storage === void 0) {
    storage = defaultStorage;
  }

  var getInitialValue = function getInitialValue() {
    try {
      var _value = storage.getItem(key);

      if (_value instanceof Promise) {
        return _value.catch(function () {
          return initialValue;
        });
      }

      return _value;
    } catch (_unused) {
      return initialValue;
    }
  };

  var baseAtom = jotai.atom(storage.delayInit ? initialValue : getInitialValue());

  baseAtom.onMount = function (setAtom) {
    var unsub;

    if (storage.subscribe) {
      unsub = storage.subscribe(key, setAtom);
    }

    if (storage.delayInit) {
      var _value2 = getInitialValue();

      if (_value2 instanceof Promise) {
        _value2.then(setAtom);
      } else {
        setAtom(_value2);
      }
    }

    return unsub;
  };

  var anAtom = jotai.atom(function (get) {
    return get(baseAtom);
  }, function (get, set, update) {
    var newValue = typeof update === 'function' ? update(get(baseAtom)) : update;
    set(baseAtom, newValue);
    storage.setItem(key, newValue);
  });
  return anAtom;
}
function atomWithHash(key, initialValue, serialize, deserialize) {
  if (serialize === void 0) {
    serialize = JSON.stringify;
  }

  if (deserialize === void 0) {
    deserialize = JSON.parse;
  }

  var hashStorage = {
    getItem: function getItem(key) {
      var searchParams = new URLSearchParams(location.hash.slice(1));
      var storedValue = searchParams.get(key);

      if (storedValue === null) {
        throw new Error('no value stored');
      }

      return deserialize(storedValue);
    },
    setItem: function setItem(key, newValue) {
      var searchParams = new URLSearchParams(location.hash.slice(1));
      searchParams.set(key, serialize(newValue));
      location.hash = searchParams.toString();
    },
    delayInit: true,
    subscribe: function subscribe(key, setValue) {
      var callback = function callback() {
        var searchParams = new URLSearchParams(location.hash.slice(1));
        var str = searchParams.get(key);

        if (str !== null) {
          setValue(deserialize(str));
        }
      };

      window.addEventListener('hashchange', callback);
      return function () {
        window.removeEventListener('hashchange', callback);
      };
    }
  };
  return atomWithStorage(key, initialValue, hashStorage);
}

function atomWithObservable(createObservable) {
  var observableResultAtom = jotai.atom(function (get) {
    var settlePromise = null;
    var observable = createObservable(get);
    var returnsItself = observable[Symbol.observable];

    if (returnsItself) {
      observable = returnsItself();
    }

    var dataAtom = jotai.atom(new Promise(function (resolve, reject) {
      settlePromise = function settlePromise(data, err) {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      };
    }));

    var setData = function setData() {
      throw new Error('setting data without mount');
    };

    var dataListener = function dataListener(data) {
      if (settlePromise) {
        settlePromise(data);
        settlePromise = null;

        if (subscription && !setData) {
          subscription.unsubscribe();
          subscription = null;
        }
      } else {
        setData(data);
      }
    };

    var errorListener = function errorListener(error) {
      if (settlePromise) {
        settlePromise(null, error);
        settlePromise = null;

        if (subscription && !setData) {
          subscription.unsubscribe();
          subscription = null;
        }
      } else {
        setData(Promise.reject(error));
      }
    };

    var subscription = null;
    subscription = observable.subscribe(dataListener, errorListener);

    if (!settlePromise) {
      subscription.unsubscribe();
      subscription = null;
    }

    dataAtom.onMount = function (update) {
      setData = update;

      if (!subscription) {
        subscription = observable.subscribe(dataListener, errorListener);
      }

      return function () {
        var _subscription;

        return (_subscription = subscription) == null ? void 0 : _subscription.unsubscribe();
      };
    };

    return {
      dataAtom: dataAtom,
      observable: observable
    };
  });
  var observableAtom = jotai.atom(function (get) {
    var _get = get(observableResultAtom),
        dataAtom = _get.dataAtom;

    return get(dataAtom);
  }, function (get, _set, data) {
    var _get2 = get(observableResultAtom),
        observable = _get2.observable;

    if ('next' in observable) {
      observable.next(data);
    } else {
      throw new Error('observable is not subject');
    }
  });
  return observableAtom;
}

var hydratedMap = new WeakMap();
function useHydrateAtoms(values, scope) {
  var ScopeContext = jotai.SECRET_INTERNAL_getScopeContext(scope);
  var scopeContainer = react.useContext(ScopeContext);
  var store = scopeContainer[0];
  var hydratedSet = getHydratedSet(scopeContainer);
  var tuplesToRestore = [];

  for (var _iterator = _createForOfIteratorHelperLoose(values), _step; !(_step = _iterator()).done;) {
    var tuple = _step.value;
    var atom = tuple[0];

    if (!hydratedSet.has(atom)) {
      hydratedSet.add(atom);
      tuplesToRestore.push(tuple);
    }
  }

  if (tuplesToRestore.length) {
    store[RESTORE_ATOMS](tuplesToRestore);
  }
}

function getHydratedSet(scopeContainer) {
  var hydratedSet = hydratedMap.get(scopeContainer);

  if (!hydratedSet) {
    hydratedSet = new WeakSet();
    hydratedMap.set(scopeContainer, hydratedSet);
  }

  return hydratedSet;
}

var memoizeAtom = createMemoizeAtom();
var errorLoadableCache = new WeakMap();
var LOADING_LOADABLE = {
  state: 'loading'
};
function loadable(anAtom) {
  return memoizeAtom(function () {
    var derivedAtom = jotai.atom(function (get) {
      try {
        var value = get(anAtom);
        return {
          state: 'hasData',
          data: value
        };
      } catch (error) {
        if (error instanceof Promise) {
          return LOADING_LOADABLE;
        }

        var cachedErrorLoadable = errorLoadableCache.get(error);

        if (cachedErrorLoadable) {
          return cachedErrorLoadable;
        }

        var errorLoadable = {
          state: 'hasError',
          error: error
        };
        errorLoadableCache.set(error, errorLoadable);
        return errorLoadable;
      }
    });
    return derivedAtom;
  }, [anAtom]);
}

exports.RESET = RESET;
exports.atomFamily = atomFamily;
exports.atomWithDefault = atomWithDefault;
exports.atomWithHash = atomWithHash;
exports.atomWithObservable = atomWithObservable;
exports.atomWithReducer = atomWithReducer;
exports.atomWithReset = atomWithReset;
exports.atomWithStorage = atomWithStorage;
exports.createJSONStorage = createJSONStorage;
exports.freezeAtom = freezeAtom;
exports.freezeAtomCreator = freezeAtomCreator;
exports.loadable = loadable;
exports.selectAtom = selectAtom;
exports.splitAtom = splitAtom;
exports.useAtomCallback = useAtomCallback;
exports.useAtomValue = useAtomValue;
exports.useHydrateAtoms = useHydrateAtoms;
exports.useReducerAtom = useReducerAtom;
exports.useResetAtom = useResetAtom;
exports.useUpdateAtom = useUpdateAtom;
exports.waitForAll = waitForAll;
