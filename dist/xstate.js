'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var xstate = require('xstate');
var jotai = require('jotai');

function _objectWithoutPropertiesLoose(source, excluded) {
  if (source == null) return {};
  var target = {};
  var sourceKeys = Object.keys(source);
  var key, i;

  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
    if (excluded.indexOf(key) >= 0) continue;
    target[key] = source[key];
  }

  return target;
}

var _excluded = ["guards", "actions", "activities", "services", "delays"];
function atomWithMachine(getMachine, getOptions) {
  var cachedMachineAtom = jotai.atom(null);
  var machineAtom = jotai.atom(function (get) {
    var cachedMachine = get(cachedMachineAtom);

    if (cachedMachine) {
      return cachedMachine;
    }

    var initializing = true;

    var safeGet = function safeGet(a) {
      if (initializing) {
        return get(a);
      }

      throw new Error('get not allowed after initialization');
    };

    var machine = typeof getMachine === 'function' ? getMachine(safeGet) : getMachine;
    var options = typeof getOptions === 'function' ? getOptions(safeGet) : getOptions;
    initializing = false;

    var _ref = options || {},
        guards = _ref.guards,
        actions = _ref.actions,
        activities = _ref.activities,
        services = _ref.services,
        delays = _ref.delays,
        interpreterOptions = _objectWithoutPropertiesLoose(_ref, _excluded);

    var machineConfig = {
      guards: guards,
      actions: actions,
      activities: activities,
      services: services,
      delays: delays
    };
    var machineWithConfig = machine.withConfig(machineConfig, machine.context);
    var service = xstate.interpret(machineWithConfig, interpreterOptions);
    return {
      machine: machineWithConfig,
      service: service
    };
  }, function (get, set, _arg) {
    set(cachedMachineAtom, get(machineAtom));
  });

  machineAtom.onMount = function (commit) {
    commit();
  };

  var cachedMachineStateAtom = jotai.atom(null);
  var machineStateAtom = jotai.atom(function (get) {
    var _get;

    return (_get = get(cachedMachineStateAtom)) != null ? _get : get(machineAtom).machine.initialState;
  }, function (get, set, registerCleanup) {
    var _get2 = get(machineAtom),
        service = _get2.service;

    service.onTransition(function (nextState) {
      set(cachedMachineStateAtom, nextState);
    });
    service.start();
    registerCleanup(function () {
      service.stop();
    });
  });

  machineStateAtom.onMount = function (initialize) {
    var unsub;
    initialize(function (cleanup) {
      if (unsub === false) {
        cleanup();
      } else {
        unsub = cleanup;
      }
    });
    return function () {
      if (unsub) {
        unsub();
      }

      unsub = false;
    };
  };

  var machineStateWithServiceAtom = jotai.atom(function (get) {
    return get(machineStateAtom);
  }, function (get, _set, event) {
    var _get3 = get(machineAtom),
        service = _get3.service;

    service.send(event);
  });
  return machineStateWithServiceAtom;
}

exports.atomWithMachine = atomWithMachine;
