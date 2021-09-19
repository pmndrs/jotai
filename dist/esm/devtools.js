import { useRef, useEffect, useContext, useState, useCallback } from 'react';
import { useAtom, SECRET_INTERNAL_getScopeContext } from 'jotai';

function useAtomDevtools(anAtom, name, scope) {
  let extension;
  try {
    extension = window.__REDUX_DEVTOOLS_EXTENSION__;
  } catch {
  }
  if (!extension) {
    if (typeof process === "object" && process.env.NODE_ENV === "development" && typeof window !== "undefined") {
      console.warn("Please install/enable Redux devtools extension");
    }
  }
  const [value, setValue] = useAtom(anAtom, scope);
  const lastValue = useRef(value);
  const isTimeTraveling = useRef(false);
  const devtools = useRef();
  const atomName = name || anAtom.debugLabel || anAtom.toString();
  useEffect(() => {
    if (extension) {
      devtools.current = extension.connect({ name: atomName });
      const unsubscribe = devtools.current.subscribe((message) => {
        var _a, _b, _c, _d, _e, _f;
        if (message.type === "DISPATCH" && message.state) {
          if (((_a = message.payload) == null ? void 0 : _a.type) === "JUMP_TO_ACTION" || ((_b = message.payload) == null ? void 0 : _b.type) === "JUMP_TO_STATE") {
            isTimeTraveling.current = true;
          }
          setValue(JSON.parse(message.state));
        } else if (message.type === "DISPATCH" && ((_c = message.payload) == null ? void 0 : _c.type) === "COMMIT") {
          (_d = devtools.current) == null ? void 0 : _d.init(lastValue.current);
        } else if (message.type === "DISPATCH" && ((_e = message.payload) == null ? void 0 : _e.type) === "IMPORT_STATE") {
          const computedStates = ((_f = message.payload.nextLiftedState) == null ? void 0 : _f.computedStates) || [];
          computedStates.forEach(({ state }, index) => {
            var _a2;
            if (index === 0) {
              (_a2 = devtools.current) == null ? void 0 : _a2.init(state);
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
  useEffect(() => {
    if (devtools.current) {
      lastValue.current = value;
      if (devtools.current.shouldInit) {
        devtools.current.init(value);
        devtools.current.shouldInit = false;
      } else if (isTimeTraveling.current) {
        isTimeTraveling.current = false;
      } else {
        devtools.current.send(`${atomName} - ${new Date().toLocaleString()}`, value);
      }
    }
  }, [anAtom, extension, atomName, value]);
}

var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
typeof require !== "undefined" ? require : (x) => {
  throw new Error('Dynamic require of "' + x + '" is not supported');
};
const hasInitialValue = (atom) => "init" in atom;
const IS_EQUAL_PROMISE = Symbol();
const INTERRUPT_PROMISE = Symbol();
const isInterruptablePromise = (promise) => !!promise[INTERRUPT_PROMISE];
const createInterruptablePromise = (promise) => {
  let interrupt;
  const interruptablePromise = new Promise((resolve, reject) => {
    interrupt = resolve;
    promise.then(resolve, reject);
  });
  interruptablePromise[IS_EQUAL_PROMISE] = (p) => p === interruptablePromise || p === promise;
  interruptablePromise[INTERRUPT_PROMISE] = interrupt;
  return interruptablePromise;
};
const READ_ATOM = "r";
const WRITE_ATOM = "w";
const FLUSH_PENDING = "f";
const SUBSCRIBE_ATOM = "s";
const RESTORE_ATOMS = "h";
const DEV_GET_ATOM_STATE = "a";
const DEV_GET_MOUNTED = "m";
const createStore = (initialValues, stateListener) => {
  const atomStateMap = new WeakMap();
  const mountedMap = new WeakMap();
  const pendingMap = new Map();
  if (initialValues) {
    for (const [atom, value] of initialValues) {
      const atomState = { v: value, r: 0, d: new Map() };
      if (typeof process === "object" && process.env.NODE_ENV !== "production") {
        Object.freeze(atomState);
        if (!hasInitialValue(atom)) {
          console.warn("Found initial value for derived atom which can cause unexpected behavior", atom);
        }
      }
      atomStateMap.set(atom, atomState);
    }
  }
  const getAtomState = (atom) => atomStateMap.get(atom);
  const wipAtomState = (atom, dependencies) => {
    const atomState = getAtomState(atom);
    const nextAtomState = __spreadProps(__spreadValues({
      r: 0
    }, atomState), {
      d: dependencies ? new Map(Array.from(dependencies).map((a) => {
        var _a, _b;
        return [a, (_b = (_a = getAtomState(a)) == null ? void 0 : _a.r) != null ? _b : 0];
      })) : (atomState == null ? void 0 : atomState.d) || new Map()
    });
    return [nextAtomState, (atomState == null ? void 0 : atomState.d) || new Map()];
  };
  const setAtomValue = (atom, value, dependencies, promise) => {
    var _a, _b;
    const [atomState, prevDependencies] = wipAtomState(atom, dependencies);
    if (promise && !((_a = atomState.p) == null ? void 0 : _a[IS_EQUAL_PROMISE](promise))) {
      return;
    }
    (_b = atomState.c) == null ? void 0 : _b.call(atomState);
    delete atomState.e;
    delete atomState.p;
    delete atomState.c;
    delete atomState.i;
    if (!("v" in atomState) || !Object.is(atomState.v, value)) {
      atomState.v = value;
      ++atomState.r;
      if (atomState.d.has(atom)) {
        atomState.d.set(atom, atomState.r);
      }
    }
    commitAtomState(atom, atomState, dependencies && prevDependencies);
  };
  const setAtomReadError = (atom, error, dependencies, promise) => {
    var _a, _b;
    const [atomState, prevDependencies] = wipAtomState(atom, dependencies);
    if (promise && !((_a = atomState.p) == null ? void 0 : _a[IS_EQUAL_PROMISE](promise))) {
      return;
    }
    (_b = atomState.c) == null ? void 0 : _b.call(atomState);
    delete atomState.p;
    delete atomState.c;
    delete atomState.i;
    atomState.e = error;
    commitAtomState(atom, atomState, prevDependencies);
  };
  const setAtomReadPromise = (atom, promise, dependencies) => {
    var _a, _b;
    const [atomState, prevDependencies] = wipAtomState(atom, dependencies);
    if ((_a = atomState.p) == null ? void 0 : _a[IS_EQUAL_PROMISE](promise)) {
      return;
    }
    (_b = atomState.c) == null ? void 0 : _b.call(atomState);
    delete atomState.e;
    if (isInterruptablePromise(promise)) {
      atomState.p = promise;
      delete atomState.c;
    } else {
      const interruptablePromise = createInterruptablePromise(promise);
      atomState.p = interruptablePromise;
      atomState.c = interruptablePromise[INTERRUPT_PROMISE];
    }
    commitAtomState(atom, atomState, prevDependencies);
  };
  const setAtomInvalidated = (atom) => {
    const [atomState] = wipAtomState(atom);
    atomState.i = atomState.r;
    commitAtomState(atom, atomState);
  };
  const setAtomWritePromise = (atom, promise, prevPromise) => {
    const [atomState] = wipAtomState(atom);
    if (promise) {
      atomState.w = promise;
    } else if (atomState.w === prevPromise) {
      delete atomState.w;
    }
    commitAtomState(atom, atomState);
  };
  const scheduleReadAtomState = (atom, promise) => {
    promise.finally(() => {
      readAtomState(atom, true);
    });
  };
  const readAtomState = (atom, force) => {
    if (!force) {
      const atomState = getAtomState(atom);
      if (atomState) {
        atomState.d.forEach((_, a) => {
          if (a !== atom) {
            const aState = getAtomState(a);
            if (aState && !aState.e && !aState.p && aState.r === aState.i) {
              readAtomState(a, true);
            }
          }
        });
        if (Array.from(atomState.d.entries()).every(([a, r]) => {
          const aState = getAtomState(a);
          return aState && !aState.e && !aState.p && aState.r !== aState.i && aState.r === r;
        })) {
          return atomState;
        }
      }
    }
    let error;
    let promise;
    let value;
    const dependencies = new Set();
    try {
      const promiseOrValue = atom.read((a) => {
        dependencies.add(a);
        const aState = a === atom ? getAtomState(a) : readAtomState(a);
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
        throw new Error("no atom init");
      });
      if (promiseOrValue instanceof Promise) {
        promise = promiseOrValue.then((value2) => {
          setAtomValue(atom, value2, dependencies, promise);
          flushPending();
        }).catch((e) => {
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
  const readAtom = (readingAtom) => {
    const atomState = readAtomState(readingAtom);
    return atomState;
  };
  const addAtom = (addingAtom) => {
    let mounted = mountedMap.get(addingAtom);
    if (!mounted) {
      mounted = mountAtom(addingAtom);
    }
    return mounted;
  };
  const canUnmountAtom = (atom, mounted) => !mounted.l.size && (!mounted.d.size || mounted.d.size === 1 && mounted.d.has(atom));
  const delAtom = (deletingAtom) => {
    const mounted = mountedMap.get(deletingAtom);
    if (mounted && canUnmountAtom(deletingAtom, mounted)) {
      unmountAtom(deletingAtom);
    }
  };
  const invalidateDependents = (atom) => {
    const mounted = mountedMap.get(atom);
    mounted == null ? void 0 : mounted.d.forEach((dependent) => {
      if (dependent === atom) {
        return;
      }
      setAtomInvalidated(dependent);
      invalidateDependents(dependent);
    });
  };
  const writeAtomState = (atom, update) => {
    const writeGetter = (a, unstable_promise = false) => {
      const aState = readAtomState(a);
      if (aState.e) {
        throw aState.e;
      }
      if (aState.p) {
        if (typeof process === "object" && process.env.NODE_ENV !== "production") {
          if (unstable_promise) {
            console.info("promise option in getter is an experimental feature.", a);
          } else {
            console.warn("Reading pending atom state in write operation. We throw a promise for now.", a);
          }
        }
        if (unstable_promise) {
          return aState.p.then(() => writeGetter(a, unstable_promise));
        }
        throw aState.p;
      }
      if ("v" in aState) {
        return aState.v;
      }
      if (typeof process === "object" && process.env.NODE_ENV !== "production") {
        console.warn("[Bug] no value found while reading atom in write operation. This is probably a bug.", a);
      }
      throw new Error("no value found");
    };
    const setter = (a, v) => {
      let promiseOrVoid2;
      if (a === atom) {
        if (!hasInitialValue(a)) {
          throw new Error("no atom init");
        }
        if (v instanceof Promise) {
          promiseOrVoid2 = v.then((resolvedValue) => {
            setAtomValue(a, resolvedValue);
            invalidateDependents(a);
            flushPending();
          }).catch((e) => {
            setAtomReadError(atom, e instanceof Error ? e : new Error(e));
            flushPending();
          });
          setAtomReadPromise(atom, promiseOrVoid2);
        } else {
          setAtomValue(a, v);
        }
        invalidateDependents(a);
        flushPending();
      } else {
        promiseOrVoid2 = writeAtomState(a, v);
      }
      return promiseOrVoid2;
    };
    const promiseOrVoid = atom.write(writeGetter, setter, update);
    if (promiseOrVoid instanceof Promise) {
      const promise = promiseOrVoid.finally(() => {
        setAtomWritePromise(atom, null, promise);
        flushPending();
      });
      setAtomWritePromise(atom, promise);
    }
    flushPending();
    return promiseOrVoid;
  };
  const writeAtom = (writingAtom, update) => {
    const promiseOrVoid = writeAtomState(writingAtom, update);
    return promiseOrVoid;
  };
  const isActuallyWritableAtom = (atom) => !!atom.write;
  const mountAtom = (atom, initialDependent) => {
    const atomState = readAtomState(atom);
    atomState.d.forEach((_, a) => {
      if (a !== atom) {
        const aMounted = mountedMap.get(a);
        if (aMounted) {
          aMounted.d.add(atom);
        } else {
          mountAtom(a, atom);
        }
      }
    });
    const mounted = {
      d: new Set(initialDependent && [initialDependent]),
      l: new Set(),
      u: void 0
    };
    mountedMap.set(atom, mounted);
    if (isActuallyWritableAtom(atom) && atom.onMount) {
      const setAtom = (update) => writeAtom(atom, update);
      mounted.u = atom.onMount(setAtom);
    }
    return mounted;
  };
  const unmountAtom = (atom) => {
    var _a;
    const onUnmount = (_a = mountedMap.get(atom)) == null ? void 0 : _a.u;
    if (onUnmount) {
      onUnmount();
    }
    mountedMap.delete(atom);
    const atomState = getAtomState(atom);
    if (atomState) {
      atomState.d.forEach((_, a) => {
        if (a !== atom) {
          const mounted = mountedMap.get(a);
          if (mounted) {
            mounted.d.delete(atom);
            if (canUnmountAtom(a, mounted)) {
              unmountAtom(a);
            }
          }
        }
      });
    } else if (typeof process === "object" && process.env.NODE_ENV !== "production") {
      console.warn("[Bug] could not find atom state to unmount", atom);
    }
  };
  const mountDependencies = (atom, atomState, prevDependencies) => {
    const dependencies = new Set(atomState.d.keys());
    prevDependencies.forEach((_, a) => {
      if (dependencies.has(a)) {
        dependencies.delete(a);
        return;
      }
      const mounted = mountedMap.get(a);
      if (mounted) {
        mounted.d.delete(atom);
        if (canUnmountAtom(a, mounted)) {
          unmountAtom(a);
        }
      }
    });
    dependencies.forEach((a) => {
      const mounted = mountedMap.get(a);
      if (mounted) {
        const dependents = mounted.d;
        dependents.add(atom);
      } else {
        mountAtom(a, atom);
      }
    });
  };
  const commitAtomState = (atom, atomState, prevDependencies) => {
    if (typeof process === "object" && process.env.NODE_ENV !== "production") {
      Object.freeze(atomState);
    }
    const isNewAtom = !atomStateMap.has(atom);
    atomStateMap.set(atom, atomState);
    if (stateListener) {
      stateListener(atom, isNewAtom);
    }
    if (!pendingMap.has(atom)) {
      pendingMap.set(atom, prevDependencies);
    }
  };
  const flushPending = () => {
    const pending = Array.from(pendingMap);
    pendingMap.clear();
    pending.forEach(([atom, prevDependencies]) => {
      const atomState = getAtomState(atom);
      if (atomState) {
        if (prevDependencies) {
          mountDependencies(atom, atomState, prevDependencies);
        }
      } else if (typeof process === "object" && process.env.NODE_ENV !== "production") {
        console.warn("[Bug] atom state not found in flush", atom);
      }
      const mounted = mountedMap.get(atom);
      mounted == null ? void 0 : mounted.l.forEach((listener) => listener());
    });
  };
  const subscribeAtom = (atom, callback) => {
    const mounted = addAtom(atom);
    const listeners = mounted.l;
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
      delAtom(atom);
    };
  };
  const restoreAtoms = (values) => {
    for (const [atom, value] of values) {
      if (hasInitialValue(atom)) {
        setAtomValue(atom, value);
        invalidateDependents(atom);
      }
    }
    flushPending();
  };
  if (typeof process === "object" && process.env.NODE_ENV !== "production") {
    return {
      [READ_ATOM]: readAtom,
      [WRITE_ATOM]: writeAtom,
      [FLUSH_PENDING]: flushPending,
      [SUBSCRIBE_ATOM]: subscribeAtom,
      [RESTORE_ATOMS]: restoreAtoms,
      [DEV_GET_ATOM_STATE]: (a) => atomStateMap.get(a),
      [DEV_GET_MOUNTED]: (a) => mountedMap.get(a)
    };
  }
  return {
    [READ_ATOM]: readAtom,
    [WRITE_ATOM]: writeAtom,
    [FLUSH_PENDING]: flushPending,
    [SUBSCRIBE_ATOM]: subscribeAtom,
    [RESTORE_ATOMS]: restoreAtoms
  };
};

const createScopeContainerForProduction = (initialValues) => {
  const store = createStore(initialValues);
  return [store];
};
const createScopeContainerForDevelopment = (initialValues) => {
  const devStore = {
    listeners: new Set(),
    subscribe: (callback) => {
      devStore.listeners.add(callback);
      return () => {
        devStore.listeners.delete(callback);
      };
    },
    atoms: Array.from(initialValues != null ? initialValues : []).map(([a]) => a)
  };
  const stateListener = (updatedAtom, isNewAtom) => {
    if (isNewAtom) {
      devStore.atoms = [...devStore.atoms, updatedAtom];
    }
    Promise.resolve().then(() => {
      devStore.listeners.forEach((listener) => listener());
    });
  };
  const store = createStore(initialValues, stateListener);
  return [store, devStore];
};
const isDevScopeContainer = (scopeContainer) => {
  return scopeContainer.length > 1;
};
typeof process === "object" && process.env.NODE_ENV !== "production" ? createScopeContainerForDevelopment : createScopeContainerForProduction;

function useAtomsSnapshot(scope) {
  const ScopeContext = SECRET_INTERNAL_getScopeContext(scope);
  const scopeContainer = useContext(ScopeContext);
  if (!isDevScopeContainer(scopeContainer)) {
    throw Error("useAtomsSnapshot can only be used in dev mode.");
  }
  const [store, devStore] = scopeContainer;
  const [atomsSnapshot, setAtomsSnapshot] = useState(new Map());
  useEffect(() => {
    const callback = () => {
      const { atoms } = devStore;
      const atomToAtomValueTuples = atoms.filter((atom) => {
        var _a;
        return !!((_a = store[DEV_GET_MOUNTED]) == null ? void 0 : _a.call(store, atom));
      }).map((atom) => {
        var _a, _b;
        const atomState = (_b = (_a = store[DEV_GET_ATOM_STATE]) == null ? void 0 : _a.call(store, atom)) != null ? _b : {};
        return [atom, atomState.v];
      });
      setAtomsSnapshot(new Map(atomToAtomValueTuples));
    };
    const unsubscribe = devStore.subscribe(callback);
    callback();
    return unsubscribe;
  }, [store, devStore]);
  return atomsSnapshot;
}

function useGotoAtomsSnapshot(scope) {
  const ScopeContext = SECRET_INTERNAL_getScopeContext(scope);
  const scopeContainer = useContext(ScopeContext);
  if (!isDevScopeContainer(scopeContainer)) {
    throw new Error("useGotoAtomsSnapshot can only be used in dev mode.");
  }
  const store = scopeContainer[0];
  return useCallback((values) => {
    store[RESTORE_ATOMS](values);
  }, [store]);
}

export { useAtomDevtools, useAtomsSnapshot, useGotoAtomsSnapshot };
