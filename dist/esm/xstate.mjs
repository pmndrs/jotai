import { interpret } from 'xstate';
import { atom } from 'jotai';

var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
typeof require !== "undefined" ? require : (x) => {
  throw new Error('Dynamic require of "' + x + '" is not supported');
};
var __objRest = (source, exclude) => {
  var target = {};
  for (var prop in source)
    if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
      target[prop] = source[prop];
  if (source != null && __getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(source)) {
      if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
        target[prop] = source[prop];
    }
  return target;
};
function atomWithMachine(getMachine, getOptions) {
  const cachedMachineAtom = atom(null);
  const machineAtom = atom((get) => {
    const cachedMachine = get(cachedMachineAtom);
    if (cachedMachine) {
      return cachedMachine;
    }
    let initializing = true;
    const safeGet = (a) => {
      if (initializing) {
        return get(a);
      }
      throw new Error("get not allowed after initialization");
    };
    const machine = typeof getMachine === "function" ? getMachine(safeGet) : getMachine;
    const options = typeof getOptions === "function" ? getOptions(safeGet) : getOptions;
    initializing = false;
    const _a = options || {}, {
      guards,
      actions,
      activities,
      services,
      delays
    } = _a, interpreterOptions = __objRest(_a, [
      "guards",
      "actions",
      "activities",
      "services",
      "delays"
    ]);
    const machineConfig = {
      guards,
      actions,
      activities,
      services,
      delays
    };
    const machineWithConfig = machine.withConfig(machineConfig, machine.context);
    const service = interpret(machineWithConfig, interpreterOptions);
    return { machine: machineWithConfig, service };
  }, (get, set, _arg) => {
    set(cachedMachineAtom, get(machineAtom));
  });
  machineAtom.onMount = (commit) => {
    commit();
  };
  const cachedMachineStateAtom = atom(null);
  const machineStateAtom = atom((get) => {
    var _a;
    return (_a = get(cachedMachineStateAtom)) != null ? _a : get(machineAtom).machine.initialState;
  }, (get, set, registerCleanup) => {
    const { service } = get(machineAtom);
    service.onTransition((nextState) => {
      set(cachedMachineStateAtom, nextState);
    });
    service.start();
    registerCleanup(() => {
      service.stop();
    });
  });
  machineStateAtom.onMount = (initialize) => {
    let unsub;
    initialize((cleanup) => {
      if (unsub === false) {
        cleanup();
      } else {
        unsub = cleanup;
      }
    });
    return () => {
      if (unsub) {
        unsub();
      }
      unsub = false;
    };
  };
  const machineStateWithServiceAtom = atom((get) => get(machineStateAtom), (get, _set, event) => {
    const { service } = get(machineAtom);
    service.send(event);
  });
  return machineStateWithServiceAtom;
}

export { atomWithMachine };
