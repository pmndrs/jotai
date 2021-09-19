'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var react = require('react');
var jotai = require('jotai');

function useAtomDevtools(anAtom, name, scope) {
  var extension;

  try {
    extension = window.__REDUX_DEVTOOLS_EXTENSION__;
  } catch (_unused) {}

  if (!extension) {
    if (typeof process === 'object' && process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      console.warn('Please install/enable Redux devtools extension');
    }
  }

  var _useAtom = jotai.useAtom(anAtom, scope),
      value = _useAtom[0],
      setValue = _useAtom[1];

  var lastValue = react.useRef(value);
  var isTimeTraveling = react.useRef(false);
  var devtools = react.useRef();
  var atomName = name || anAtom.debugLabel || anAtom.toString();
  react.useEffect(function () {
    if (extension) {
      devtools.current = extension.connect({
        name: atomName
      });
      var unsubscribe = devtools.current.subscribe(function (message) {
        var _message$payload3, _message$payload4;

        if (message.type === 'DISPATCH' && message.state) {
          var _message$payload, _message$payload2;

          if (((_message$payload = message.payload) == null ? void 0 : _message$payload.type) === 'JUMP_TO_ACTION' || ((_message$payload2 = message.payload) == null ? void 0 : _message$payload2.type) === 'JUMP_TO_STATE') {
            isTimeTraveling.current = true;
          }

          setValue(JSON.parse(message.state));
        } else if (message.type === 'DISPATCH' && ((_message$payload3 = message.payload) == null ? void 0 : _message$payload3.type) === 'COMMIT') {
          var _devtools$current;

          (_devtools$current = devtools.current) == null ? void 0 : _devtools$current.init(lastValue.current);
        } else if (message.type === 'DISPATCH' && ((_message$payload4 = message.payload) == null ? void 0 : _message$payload4.type) === 'IMPORT_STATE') {
          var _message$payload$next;

          var computedStates = ((_message$payload$next = message.payload.nextLiftedState) == null ? void 0 : _message$payload$next.computedStates) || [];
          computedStates.forEach(function (_ref, index) {
            var state = _ref.state;

            if (index === 0) {
              var _devtools$current2;

              (_devtools$current2 = devtools.current) == null ? void 0 : _devtools$current2.init(state);
            } else {
              setValue(state);
            }
          });
        }
      });
      devtools.current.shouldInit = true;
      return unsubscribe;
    }
  }, [anAtom, extension, atomName, setValue]);
  react.useEffect(function () {
    if (devtools.current) {
      lastValue.current = value;

      if (devtools.current.shouldInit) {
        devtools.current.init(value);
        devtools.current.shouldInit = false;
      } else if (isTimeTraveling.current) {
        isTimeTraveling.current = false;
      } else {
        devtools.current.send(atomName + " - " + new Date().toLocaleString(), value);
      }
    }
  }, [anAtom, extension, atomName, value]);
}

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

var hasInitialValue = function hasInitialValue(atom) {
  return 'init' in atom;
};

var IS_EQUAL_PROMISE = Symbol();
var INTERRUPT_PROMISE = Symbol();

var isInterruptablePromise = function isInterruptablePromise(promise) {
  return !!promise[INTERRUPT_PROMISE];
};

var createInterruptablePromise = function createInterruptablePromise(promise) {
  var interrupt;
  var interruptablePromise = new Promise(function (resolve, reject) {
    interrupt = resolve;
    promise.then(resolve, reject);
  });

  interruptablePromise[IS_EQUAL_PROMISE] = function (p) {
    return p === interruptablePromise || p === promise;
  };

  interruptablePromise[INTERRUPT_PROMISE] = interrupt;
  return interruptablePromise;
};

var READ_ATOM = 'r';
var WRITE_ATOM = 'w';
var FLUSH_PENDING = 'f';
var SUBSCRIBE_ATOM = 's';
var RESTORE_ATOMS = 'h';
var DEV_GET_ATOM_STATE = 'a';
var DEV_GET_MOUNTED = 'm';
var createStore = function createStore(initialValues, stateListener) {
  var _ref4;

  var atomStateMap = new WeakMap();
  var mountedMap = new WeakMap();
  var pendingMap = new Map();

  if (initialValues) {
    for (var _iterator = _createForOfIteratorHelperLoose(initialValues), _step; !(_step = _iterator()).done;) {
      var _step$value = _step.value,
          atom = _step$value[0],
          value = _step$value[1];
      var atomState = {
        v: value,
        r: 0,
        d: new Map()
      };

      if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
        Object.freeze(atomState);

        if (!hasInitialValue(atom)) {
          console.warn('Found initial value for derived atom which can cause unexpected behavior', atom);
        }
      }

      atomStateMap.set(atom, atomState);
    }
  }

  var getAtomState = function getAtomState(atom) {
    return atomStateMap.get(atom);
  };

  var wipAtomState = function wipAtomState(atom, dependencies) {
    var atomState = getAtomState(atom);

    var nextAtomState = _extends({
      r: 0
    }, atomState, {
      d: dependencies ? new Map(Array.from(dependencies).map(function (a) {
        var _getAtomState$r, _getAtomState;

        return [a, (_getAtomState$r = (_getAtomState = getAtomState(a)) == null ? void 0 : _getAtomState.r) != null ? _getAtomState$r : 0];
      })) : (atomState == null ? void 0 : atomState.d) || new Map()
    });

    return [nextAtomState, (atomState == null ? void 0 : atomState.d) || new Map()];
  };

  var setAtomValue = function setAtomValue(atom, value, dependencies, promise) {
    var _atomState$p;

    var _wipAtomState = wipAtomState(atom, dependencies),
        atomState = _wipAtomState[0],
        prevDependencies = _wipAtomState[1];

    if (promise && !((_atomState$p = atomState.p) != null && _atomState$p[IS_EQUAL_PROMISE](promise))) {
      return;
    }

    atomState.c == null ? void 0 : atomState.c();
    delete atomState.e;
    delete atomState.p;
    delete atomState.c;
    delete atomState.i;

    if (!('v' in atomState) || !Object.is(atomState.v, value)) {
      atomState.v = value;
      ++atomState.r;

      if (atomState.d.has(atom)) {
        atomState.d.set(atom, atomState.r);
      }
    }

    commitAtomState(atom, atomState, dependencies && prevDependencies);
  };

  var setAtomReadError = function setAtomReadError(atom, error, dependencies, promise) {
    var _atomState$p2;

    var _wipAtomState2 = wipAtomState(atom, dependencies),
        atomState = _wipAtomState2[0],
        prevDependencies = _wipAtomState2[1];

    if (promise && !((_atomState$p2 = atomState.p) != null && _atomState$p2[IS_EQUAL_PROMISE](promise))) {
      return;
    }

    atomState.c == null ? void 0 : atomState.c();
    delete atomState.p;
    delete atomState.c;
    delete atomState.i;
    atomState.e = error;
    commitAtomState(atom, atomState, prevDependencies);
  };

  var setAtomReadPromise = function setAtomReadPromise(atom, promise, dependencies) {
    var _atomState$p3;

    var _wipAtomState3 = wipAtomState(atom, dependencies),
        atomState = _wipAtomState3[0],
        prevDependencies = _wipAtomState3[1];

    if ((_atomState$p3 = atomState.p) != null && _atomState$p3[IS_EQUAL_PROMISE](promise)) {
      return;
    }

    atomState.c == null ? void 0 : atomState.c();
    delete atomState.e;

    if (isInterruptablePromise(promise)) {
      atomState.p = promise;
      delete atomState.c;
    } else {
      var interruptablePromise = createInterruptablePromise(promise);
      atomState.p = interruptablePromise;
      atomState.c = interruptablePromise[INTERRUPT_PROMISE];
    }

    commitAtomState(atom, atomState, prevDependencies);
  };

  var setAtomInvalidated = function setAtomInvalidated(atom) {
    var _wipAtomState4 = wipAtomState(atom),
        atomState = _wipAtomState4[0];

    atomState.i = atomState.r;
    commitAtomState(atom, atomState);
  };

  var setAtomWritePromise = function setAtomWritePromise(atom, promise, prevPromise) {
    var _wipAtomState5 = wipAtomState(atom),
        atomState = _wipAtomState5[0];

    if (promise) {
      atomState.w = promise;
    } else if (atomState.w === prevPromise) {
      delete atomState.w;
    }

    commitAtomState(atom, atomState);
  };

  var scheduleReadAtomState = function scheduleReadAtomState(atom, promise) {
    promise.finally(function () {
      readAtomState(atom, true);
    });
  };

  var readAtomState = function readAtomState(atom, force) {
    if (!force) {
      var _atomState = getAtomState(atom);

      if (_atomState) {
        _atomState.d.forEach(function (_, a) {
          if (a !== atom) {
            var aState = getAtomState(a);

            if (aState && !aState.e && !aState.p && aState.r === aState.i) {
              readAtomState(a, true);
            }
          }
        });

        if (Array.from(_atomState.d.entries()).every(function (_ref) {
          var a = _ref[0],
              r = _ref[1];
          var aState = getAtomState(a);
          return aState && !aState.e && !aState.p && aState.r !== aState.i && aState.r === r;
        })) {
          return _atomState;
        }
      }
    }

    var error;
    var promise;
    var value;
    var dependencies = new Set();

    try {
      var promiseOrValue = atom.read(function (a) {
        dependencies.add(a);
        var aState = a === atom ? getAtomState(a) : readAtomState(a);

        if (aState) {
          if (aState.e) {
            throw aState.e;
          }

          if (aState.p) {
            throw aState.p;
          }

          return aState.v;
        }

        if (hasInitialValue(a)) {
          return a.init;
        }

        throw new Error('no atom init');
      });

      if (promiseOrValue instanceof Promise) {
        promise = promiseOrValue.then(function (value) {
          setAtomValue(atom, value, dependencies, promise);
          flushPending();
        }).catch(function (e) {
          if (e instanceof Promise) {
            scheduleReadAtomState(atom, e);
            return e;
          }

          setAtomReadError(atom, e instanceof Error ? e : new Error(e), dependencies, promise);
          flushPending();
        });
      } else {
        value = promiseOrValue;
      }
    } catch (errorOrPromise) {
      if (errorOrPromise instanceof Promise) {
        promise = errorOrPromise;
      } else if (errorOrPromise instanceof Error) {
        error = errorOrPromise;
      } else {
        error = new Error(errorOrPromise);
      }
    }

    if (error) {
      setAtomReadError(atom, error, dependencies);
    } else if (promise) {
      setAtomReadPromise(atom, promise, dependencies);
    } else {
      setAtomValue(atom, value, dependencies);
    }

    return getAtomState(atom);
  };

  var readAtom = function readAtom(readingAtom) {
    var atomState = readAtomState(readingAtom);
    return atomState;
  };

  var addAtom = function addAtom(addingAtom) {
    var mounted = mountedMap.get(addingAtom);

    if (!mounted) {
      mounted = mountAtom(addingAtom);
    }

    return mounted;
  };

  var canUnmountAtom = function canUnmountAtom(atom, mounted) {
    return !mounted.l.size && (!mounted.d.size || mounted.d.size === 1 && mounted.d.has(atom));
  };

  var delAtom = function delAtom(deletingAtom) {
    var mounted = mountedMap.get(deletingAtom);

    if (mounted && canUnmountAtom(deletingAtom, mounted)) {
      unmountAtom(deletingAtom);
    }
  };

  var invalidateDependents = function invalidateDependents(atom) {
    var mounted = mountedMap.get(atom);
    mounted == null ? void 0 : mounted.d.forEach(function (dependent) {
      if (dependent === atom) {
        return;
      }

      setAtomInvalidated(dependent);
      invalidateDependents(dependent);
    });
  };

  var writeAtomState = function writeAtomState(atom, update) {
    var writeGetter = function writeGetter(a, unstable_promise) {
      if (unstable_promise === void 0) {
        unstable_promise = false;
      }

      var aState = readAtomState(a);

      if (aState.e) {
        throw aState.e;
      }

      if (aState.p) {
        if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
          if (unstable_promise) {
            console.info('promise option in getter is an experimental feature.', a);
          } else {
            console.warn('Reading pending atom state in write operation. We throw a promise for now.', a);
          }
        }

        if (unstable_promise) {
          return aState.p.then(function () {
            return writeGetter(a, unstable_promise);
          });
        }

        throw aState.p;
      }

      if ('v' in aState) {
        return aState.v;
      }

      if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
        console.warn('[Bug] no value found while reading atom in write operation. This is probably a bug.', a);
      }

      throw new Error('no value found');
    };

    var setter = function setter(a, v) {
      var promiseOrVoid;

      if (a === atom) {
        if (!hasInitialValue(a)) {
          throw new Error('no atom init');
        }

        if (v instanceof Promise) {
          promiseOrVoid = v.then(function (resolvedValue) {
            setAtomValue(a, resolvedValue);
            invalidateDependents(a);
            flushPending();
          }).catch(function (e) {
            setAtomReadError(atom, e instanceof Error ? e : new Error(e));
            flushPending();
          });
          setAtomReadPromise(atom, promiseOrVoid);
        } else {
          setAtomValue(a, v);
        }

        invalidateDependents(a);
        flushPending();
      } else {
        promiseOrVoid = writeAtomState(a, v);
      }

      return promiseOrVoid;
    };

    var promiseOrVoid = atom.write(writeGetter, setter, update);

    if (promiseOrVoid instanceof Promise) {
      var promise = promiseOrVoid.finally(function () {
        setAtomWritePromise(atom, null, promise);
        flushPending();
      });
      setAtomWritePromise(atom, promise);
    }

    flushPending();
    return promiseOrVoid;
  };

  var writeAtom = function writeAtom(writingAtom, update) {
    var promiseOrVoid = writeAtomState(writingAtom, update);
    return promiseOrVoid;
  };

  var isActuallyWritableAtom = function isActuallyWritableAtom(atom) {
    return !!atom.write;
  };

  var mountAtom = function mountAtom(atom, initialDependent) {
    var atomState = readAtomState(atom);
    atomState.d.forEach(function (_, a) {
      if (a !== atom) {
        var aMounted = mountedMap.get(a);

        if (aMounted) {
          aMounted.d.add(atom);
        } else {
          mountAtom(a, atom);
        }
      }
    });
    var mounted = {
      d: new Set(initialDependent && [initialDependent]),
      l: new Set(),
      u: undefined
    };
    mountedMap.set(atom, mounted);

    if (isActuallyWritableAtom(atom) && atom.onMount) {
      var setAtom = function setAtom(update) {
        return writeAtom(atom, update);
      };

      mounted.u = atom.onMount(setAtom);
    }

    return mounted;
  };

  var unmountAtom = function unmountAtom(atom) {
    var _mountedMap$get;

    var onUnmount = (_mountedMap$get = mountedMap.get(atom)) == null ? void 0 : _mountedMap$get.u;

    if (onUnmount) {
      onUnmount();
    }

    mountedMap.delete(atom);
    var atomState = getAtomState(atom);

    if (atomState) {
      atomState.d.forEach(function (_, a) {
        if (a !== atom) {
          var mounted = mountedMap.get(a);

          if (mounted) {
            mounted.d.delete(atom);

            if (canUnmountAtom(a, mounted)) {
              unmountAtom(a);
            }
          }
        }
      });
    } else if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
      console.warn('[Bug] could not find atom state to unmount', atom);
    }
  };

  var mountDependencies = function mountDependencies(atom, atomState, prevDependencies) {
    var dependencies = new Set(atomState.d.keys());
    prevDependencies.forEach(function (_, a) {
      if (dependencies.has(a)) {
        dependencies.delete(a);
        return;
      }

      var mounted = mountedMap.get(a);

      if (mounted) {
        mounted.d.delete(atom);

        if (canUnmountAtom(a, mounted)) {
          unmountAtom(a);
        }
      }
    });
    dependencies.forEach(function (a) {
      var mounted = mountedMap.get(a);

      if (mounted) {
        var dependents = mounted.d;
        dependents.add(atom);
      } else {
        mountAtom(a, atom);
      }
    });
  };

  var commitAtomState = function commitAtomState(atom, atomState, prevDependencies) {
    if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
      Object.freeze(atomState);
    }

    var isNewAtom = !atomStateMap.has(atom);
    atomStateMap.set(atom, atomState);

    if (stateListener) {
      stateListener(atom, isNewAtom);
    }

    if (!pendingMap.has(atom)) {
      pendingMap.set(atom, prevDependencies);
    }
  };

  var flushPending = function flushPending() {
    var pending = Array.from(pendingMap);
    pendingMap.clear();
    pending.forEach(function (_ref2) {
      var atom = _ref2[0],
          prevDependencies = _ref2[1];
      var atomState = getAtomState(atom);

      if (atomState) {
        if (prevDependencies) {
          mountDependencies(atom, atomState, prevDependencies);
        }
      } else if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
        console.warn('[Bug] atom state not found in flush', atom);
      }

      var mounted = mountedMap.get(atom);
      mounted == null ? void 0 : mounted.l.forEach(function (listener) {
        return listener();
      });
    });
  };

  var subscribeAtom = function subscribeAtom(atom, callback) {
    var mounted = addAtom(atom);
    var listeners = mounted.l;
    listeners.add(callback);
    return function () {
      listeners.delete(callback);
      delAtom(atom);
    };
  };

  var restoreAtoms = function restoreAtoms(values) {
    for (var _iterator2 = _createForOfIteratorHelperLoose(values), _step2; !(_step2 = _iterator2()).done;) {
      var _step2$value = _step2.value,
          _atom = _step2$value[0],
          _value = _step2$value[1];

      if (hasInitialValue(_atom)) {
        setAtomValue(_atom, _value);
        invalidateDependents(_atom);
      }
    }

    flushPending();
  };

  if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
    var _ref3;

    return _ref3 = {}, _ref3[READ_ATOM] = readAtom, _ref3[WRITE_ATOM] = writeAtom, _ref3[FLUSH_PENDING] = flushPending, _ref3[SUBSCRIBE_ATOM] = subscribeAtom, _ref3[RESTORE_ATOMS] = restoreAtoms, _ref3[DEV_GET_ATOM_STATE] = function (a) {
      return atomStateMap.get(a);
    }, _ref3[DEV_GET_MOUNTED] = function (a) {
      return mountedMap.get(a);
    }, _ref3;
  }

  return _ref4 = {}, _ref4[READ_ATOM] = readAtom, _ref4[WRITE_ATOM] = writeAtom, _ref4[FLUSH_PENDING] = flushPending, _ref4[SUBSCRIBE_ATOM] = subscribeAtom, _ref4[RESTORE_ATOMS] = restoreAtoms, _ref4;
};

var createScopeContainerForProduction = function createScopeContainerForProduction(initialValues) {
  var store = createStore(initialValues);
  return [store];
};

var createScopeContainerForDevelopment = function createScopeContainerForDevelopment(initialValues) {
  var devStore = {
    listeners: new Set(),
    subscribe: function subscribe(callback) {
      devStore.listeners.add(callback);
      return function () {
        devStore.listeners.delete(callback);
      };
    },
    atoms: Array.from(initialValues != null ? initialValues : []).map(function (_ref) {
      var a = _ref[0];
      return a;
    })
  };

  var stateListener = function stateListener(updatedAtom, isNewAtom) {
    if (isNewAtom) {
      devStore.atoms = [].concat(devStore.atoms, [updatedAtom]);
    }

    Promise.resolve().then(function () {
      devStore.listeners.forEach(function (listener) {
        return listener();
      });
    });
  };

  var store = createStore(initialValues, stateListener);
  return [store, devStore];
};

var isDevScopeContainer = function isDevScopeContainer(scopeContainer) {
  return scopeContainer.length > 1;
};
typeof process === 'object' && process.env.NODE_ENV !== 'production' ? createScopeContainerForDevelopment : createScopeContainerForProduction;

function useAtomsSnapshot(scope) {
  var ScopeContext = jotai.SECRET_INTERNAL_getScopeContext(scope);
  var scopeContainer = react.useContext(ScopeContext);

  if (!isDevScopeContainer(scopeContainer)) {
    throw Error('useAtomsSnapshot can only be used in dev mode.');
  }

  var store = scopeContainer[0],
      devStore = scopeContainer[1];

  var _useState = react.useState(new Map()),
      atomsSnapshot = _useState[0],
      setAtomsSnapshot = _useState[1];

  react.useEffect(function () {
    var callback = function callback() {
      var atoms = devStore.atoms;
      var atomToAtomValueTuples = atoms.filter(function (atom) {
        var _store$DEV_GET_MOUNTE;

        return !!((_store$DEV_GET_MOUNTE = store[DEV_GET_MOUNTED]) != null && _store$DEV_GET_MOUNTE.call(store, atom));
      }).map(function (atom) {
        var _store$DEV_GET_ATOM_S, _store$DEV_GET_ATOM_S2;

        var atomState = (_store$DEV_GET_ATOM_S = (_store$DEV_GET_ATOM_S2 = store[DEV_GET_ATOM_STATE]) == null ? void 0 : _store$DEV_GET_ATOM_S2.call(store, atom)) != null ? _store$DEV_GET_ATOM_S : {};
        return [atom, atomState.v];
      });
      setAtomsSnapshot(new Map(atomToAtomValueTuples));
    };

    var unsubscribe = devStore.subscribe(callback);
    callback();
    return unsubscribe;
  }, [store, devStore]);
  return atomsSnapshot;
}

function useGotoAtomsSnapshot(scope) {
  var ScopeContext = jotai.SECRET_INTERNAL_getScopeContext(scope);
  var scopeContainer = react.useContext(ScopeContext);

  if (!isDevScopeContainer(scopeContainer)) {
    throw new Error('useGotoAtomsSnapshot can only be used in dev mode.');
  }

  var store = scopeContainer[0];
  return react.useCallback(function (values) {
    store[RESTORE_ATOMS](values);
  }, [store]);
}

exports.useAtomDevtools = useAtomDevtools;
exports.useAtomsSnapshot = useAtomsSnapshot;
exports.useGotoAtomsSnapshot = useGotoAtomsSnapshot;
