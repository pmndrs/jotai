import { createClient } from '@urql/core';
import { atom } from 'jotai';
import { pipe, subscribe } from 'wonka';

const DEFAULT_URL = typeof process === "object" && process.env.JOTAI_URQL_DEFAULT_URL || "/graphql";
const clientAtom = atom(createClient({ url: DEFAULT_URL }));

var __defProp = Object.defineProperty;
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
typeof require !== "undefined" ? require : (x) => {
  throw new Error('Dynamic require of "' + x + '" is not supported');
};
const isOperationResultWithData$1 = (result) => "data" in result;
function atomWithQuery(createQueryArgs, getClient = (get) => get(clientAtom)) {
  const createResultAtom = (client, args, opts) => {
    let resolve = null;
    const resultAtom = atom(new Promise((r) => {
      resolve = r;
    }));
    let setResult = () => {
      throw new Error("setting result without mount");
    };
    const listener = (result) => {
      if (!isOperationResultWithData$1(result)) {
        throw new Error("result does not have data");
      }
      if (resolve) {
        resolve(result);
        resolve = null;
      } else {
        setResult(result);
      }
    };
    client.query(args.query, args.variables, __spreadValues(__spreadValues({
      requestPolicy: args.requestPolicy
    }, args.context), opts)).toPromise().then(listener).catch(() => {
    });
    resultAtom.onMount = (update) => {
      setResult = update;
      const subscription = pipe(client.query(args.query, args.variables, __spreadValues({
        requestPolicy: args.requestPolicy
      }, args.context)), subscribe(listener));
      return () => subscription.unsubscribe();
    };
    return resultAtom;
  };
  const queryResultAtom = atom((get) => {
    const args = createQueryArgs(get);
    if (args.pause) {
      return null;
    }
    const client = getClient(get);
    const resultAtom = createResultAtom(client, args);
    return { resultAtom, client, args };
  });
  const overwrittenResultAtom = atom(null);
  const queryAtom = atom((get) => {
    const queryResult = get(queryResultAtom);
    if (!queryResult) {
      return null;
    }
    let { resultAtom } = queryResult;
    const overwrittenResult = get(overwrittenResultAtom);
    if (overwrittenResult && overwrittenResult.oldResultAtom === resultAtom) {
      resultAtom = overwrittenResult.newResultAtom;
    }
    return get(resultAtom);
  }, (get, set, action) => {
    switch (action.type) {
      case "reexecute": {
        const queryResult = get(queryResultAtom);
        if (!queryResult) {
          throw new Error("query is paused");
        }
        const { resultAtom, client, args } = queryResult;
        set(overwrittenResultAtom, {
          oldResultAtom: resultAtom,
          newResultAtom: createResultAtom(client, args, action.opts)
        });
      }
    }
  });
  return queryAtom;
}

function atomWithMutation(createQuery, getClient = (get) => get(clientAtom)) {
  const operationResultAtom = atom(new Promise(() => {
  }));
  const queryResultAtom = atom((get) => get(operationResultAtom), (get, set, action) => {
    set(operationResultAtom, new Promise(() => {
    }));
    const client = getClient(get);
    const query = createQuery(get);
    client.mutation(query, action.variables, action.context).toPromise().then((result) => {
      var _a;
      set(operationResultAtom, result);
      (_a = action.callback) == null ? void 0 : _a.call(action, result);
    }).catch(() => {
    });
  });
  return queryResultAtom;
}

const isOperationResultWithData = (result) => "data" in result;
function atomWithSubscription(createSubscriptionArgs, getClient = (get) => get(clientAtom)) {
  const queryResultAtom = atom((get) => {
    const args = createSubscriptionArgs(get);
    if (args.pause) {
      return { args };
    }
    const client = getClient(get);
    let resolve = null;
    const resultAtom = atom(new Promise((r) => {
      resolve = r;
    }));
    let setResult = () => {
      throw new Error("setting result without mount");
    };
    const listener = (result) => {
      if (!isOperationResultWithData(result)) {
        throw new Error("result does not have data");
      }
      if (resolve) {
        resolve(result);
        resolve = null;
      } else {
        setResult(result);
      }
    };
    const subscriptionInRender = pipe(client.subscription(args.query, args.variables, args.context), subscribe(listener));
    let timer = setTimeout(() => {
      timer = null;
      subscriptionInRender.unsubscribe();
    }, 1e3);
    resultAtom.onMount = (update) => {
      setResult = update;
      let subscription;
      if (timer) {
        clearTimeout(timer);
        subscription = subscriptionInRender;
      } else {
        subscription = pipe(client.subscription(args.query, args.variables, args.context), subscribe(listener));
      }
      return () => subscription.unsubscribe();
    };
    return { resultAtom, args };
  });
  const queryAtom = atom((get) => {
    const { resultAtom } = get(queryResultAtom);
    return resultAtom ? get(resultAtom) : null;
  });
  return queryAtom;
}

export { atomWithMutation, atomWithQuery, atomWithSubscription, clientAtom };
