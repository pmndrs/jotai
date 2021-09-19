'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var core = require('@urql/core');
var jotai = require('jotai');
var wonka = require('wonka');

var DEFAULT_URL = typeof process === 'object' && process.env.JOTAI_URQL_DEFAULT_URL || '/graphql';
var clientAtom = jotai.atom(core.createClient({
  url: DEFAULT_URL
}));

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

var isOperationResultWithData$1 = function isOperationResultWithData(result) {
  return 'data' in result;
};

function atomWithQuery(createQueryArgs, getClient) {
  if (getClient === void 0) {
    getClient = function getClient(get) {
      return get(clientAtom);
    };
  }

  var createResultAtom = function createResultAtom(client, args, opts) {
    var resolve = null;
    var resultAtom = jotai.atom(new Promise(function (r) {
      resolve = r;
    }));

    var setResult = function setResult() {
      throw new Error('setting result without mount');
    };

    var listener = function listener(result) {
      if (!isOperationResultWithData$1(result)) {
        throw new Error('result does not have data');
      }

      if (resolve) {
        resolve(result);
        resolve = null;
      } else {
        setResult(result);
      }
    };

    client.query(args.query, args.variables, _extends({
      requestPolicy: args.requestPolicy
    }, args.context, opts)).toPromise().then(listener).catch(function () {});

    resultAtom.onMount = function (update) {
      setResult = update;
      var subscription = wonka.pipe(client.query(args.query, args.variables, _extends({
        requestPolicy: args.requestPolicy
      }, args.context)), wonka.subscribe(listener));
      return function () {
        return subscription.unsubscribe();
      };
    };

    return resultAtom;
  };

  var queryResultAtom = jotai.atom(function (get) {
    var args = createQueryArgs(get);

    if (args.pause) {
      return null;
    }

    var client = getClient(get);
    var resultAtom = createResultAtom(client, args);
    return {
      resultAtom: resultAtom,
      client: client,
      args: args
    };
  });
  var overwrittenResultAtom = jotai.atom(null);
  var queryAtom = jotai.atom(function (get) {
    var queryResult = get(queryResultAtom);

    if (!queryResult) {
      return null;
    }

    var resultAtom = queryResult.resultAtom;
    var overwrittenResult = get(overwrittenResultAtom);

    if (overwrittenResult && overwrittenResult.oldResultAtom === resultAtom) {
      resultAtom = overwrittenResult.newResultAtom;
    }

    return get(resultAtom);
  }, function (get, set, action) {
    switch (action.type) {
      case 'reexecute':
        {
          var queryResult = get(queryResultAtom);

          if (!queryResult) {
            throw new Error('query is paused');
          }

          var resultAtom = queryResult.resultAtom,
              client = queryResult.client,
              args = queryResult.args;
          set(overwrittenResultAtom, {
            oldResultAtom: resultAtom,
            newResultAtom: createResultAtom(client, args, action.opts)
          });
        }
    }
  });
  return queryAtom;
}

function atomWithMutation(createQuery, getClient) {
  if (getClient === void 0) {
    getClient = function getClient(get) {
      return get(clientAtom);
    };
  }

  var operationResultAtom = jotai.atom(new Promise(function () {}));
  var queryResultAtom = jotai.atom(function (get) {
    return get(operationResultAtom);
  }, function (get, set, action) {
    set(operationResultAtom, new Promise(function () {}));
    var client = getClient(get);
    var query = createQuery(get);
    client.mutation(query, action.variables, action.context).toPromise().then(function (result) {
      set(operationResultAtom, result);
      action.callback == null ? void 0 : action.callback(result);
    }).catch(function () {});
  });
  return queryResultAtom;
}

var isOperationResultWithData = function isOperationResultWithData(result) {
  return 'data' in result;
};

function atomWithSubscription(createSubscriptionArgs, getClient) {
  if (getClient === void 0) {
    getClient = function getClient(get) {
      return get(clientAtom);
    };
  }

  var queryResultAtom = jotai.atom(function (get) {
    var args = createSubscriptionArgs(get);

    if (args.pause) {
      return {
        args: args
      };
    }

    var client = getClient(get);
    var resolve = null;
    var resultAtom = jotai.atom(new Promise(function (r) {
      resolve = r;
    }));

    var setResult = function setResult() {
      throw new Error('setting result without mount');
    };

    var listener = function listener(result) {
      if (!isOperationResultWithData(result)) {
        throw new Error('result does not have data');
      }

      if (resolve) {
        resolve(result);
        resolve = null;
      } else {
        setResult(result);
      }
    };

    var subscriptionInRender = wonka.pipe(client.subscription(args.query, args.variables, args.context), wonka.subscribe(listener));
    var timer = setTimeout(function () {
      timer = null;
      subscriptionInRender.unsubscribe();
    }, 1000);

    resultAtom.onMount = function (update) {
      setResult = update;
      var subscription;

      if (timer) {
        clearTimeout(timer);
        subscription = subscriptionInRender;
      } else {
        subscription = wonka.pipe(client.subscription(args.query, args.variables, args.context), wonka.subscribe(listener));
      }

      return function () {
        return subscription.unsubscribe();
      };
    };

    return {
      resultAtom: resultAtom,
      args: args
    };
  });
  var queryAtom = jotai.atom(function (get) {
    var _get = get(queryResultAtom),
        resultAtom = _get.resultAtom;

    return resultAtom ? get(resultAtom) : null;
  });
  return queryAtom;
}

exports.atomWithMutation = atomWithMutation;
exports.atomWithQuery = atomWithQuery;
exports.atomWithSubscription = atomWithSubscription;
exports.clientAtom = clientAtom;
