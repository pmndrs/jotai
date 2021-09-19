'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var reactQuery = require('react-query');
var jotai = require('jotai');

var queryClientAtom = jotai.atom(new reactQuery.QueryClient());

function atomWithQuery(createQuery, getQueryClient) {
  if (getQueryClient === void 0) {
    getQueryClient = function getQueryClient(get) {
      return get(queryClientAtom);
    };
  }

  var queryDataAtom = jotai.atom(function (get) {
    var queryClient = getQueryClient(get);
    var options = typeof createQuery === 'function' ? createQuery(get) : createQuery;
    var settlePromise = null;

    var getInitialData = function getInitialData() {
      var data = queryClient.getQueryData(options.queryKey);

      if (data === undefined && options.initialData) {
        data = typeof options.initialData === 'function' ? options.initialData() : options.initialData;
      }

      return data;
    };

    var initialData = getInitialData();
    var dataAtom = jotai.atom(initialData || new Promise(function (resolve, reject) {
      settlePromise = function settlePromise(data, err) {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      };
    }));

    var setData = function setData() {
      throw new Error('atomWithQuery: setting data without mount');
    };

    var listener = function listener(result) {
      if (result.error) {
        if (settlePromise) {
          settlePromise(undefined, result.error);
          settlePromise = null;
        } else {
          setData(Promise.reject(result.error));
        }

        return;
      }

      if (result.data === undefined) {
        return;
      }

      if (settlePromise) {
        settlePromise(result.data);
        settlePromise = null;
      } else {
        setData(result.data);
      }
    };

    var defaultedOptions = queryClient.defaultQueryObserverOptions(options);

    if (typeof defaultedOptions.staleTime !== 'number') {
      defaultedOptions.staleTime = 1000;
    }

    var observer = new reactQuery.QueryObserver(queryClient, defaultedOptions);

    if (initialData === undefined && options.enabled !== false) {
      observer.fetchOptimistic(defaultedOptions).then(listener).catch(function (error) {
        return listener({
          error: error
        });
      });
    }

    dataAtom.onMount = function (update) {
      setData = update;
      var unsubscribe = observer.subscribe(listener);

      if (options.enabled === false) {
        if (settlePromise) {
          settlePromise(undefined);
        } else {
          setData(undefined);
        }
      }

      return unsubscribe;
    };

    return {
      dataAtom: dataAtom,
      observer: observer
    };
  }, function (get, set, action) {
    switch (action.type) {
      case 'refetch':
        {
          var _get2 = get(queryDataAtom),
              dataAtom = _get2.dataAtom,
              observer = _get2.observer;

          set(dataAtom, new Promise(function () {}));
          var p = Promise.resolve().then(function () {
            return observer.refetch({
              cancelRefetch: true
            });
          }).then(function () {});
          return p;
        }
    }
  });
  var queryAtom = jotai.atom(function (get) {
    var _get3 = get(queryDataAtom),
        dataAtom = _get3.dataAtom;

    return get(dataAtom);
  }, function (_get, set, action) {
    return set(queryDataAtom, action);
  });
  return queryAtom;
}

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

var _excluded = ["type"];
function atomWithInfiniteQuery(createQuery, getQueryClient) {
  if (getQueryClient === void 0) {
    getQueryClient = function getQueryClient(get) {
      return get(queryClientAtom);
    };
  }

  var queryDataAtom = jotai.atom(function (get) {
    var queryClient = getQueryClient(get);
    var options = typeof createQuery === 'function' ? createQuery(get) : createQuery;
    var settlePromise = null;

    var getInitialData = function getInitialData() {
      var data = queryClient.getQueryData(options.queryKey);

      if (data === undefined && options.initialData) {
        data = typeof options.initialData === 'function' ? options.initialData() : options.initialData;
      }

      return data;
    };

    var initialData = getInitialData();
    var dataAtom = jotai.atom(initialData || new Promise(function (resolve, reject) {
      settlePromise = function settlePromise(data, err) {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      };
    }));

    var setData = function setData() {
      throw new Error('atomWithInfiniteQuery: setting data without mount');
    };

    var listener = function listener(result) {
      if (result.error && !reactQuery.isCancelledError(result.error)) {
        if (settlePromise) {
          settlePromise(undefined, result.error);
          settlePromise = null;
        } else {
          setData(Promise.reject(result.error));
        }

        return;
      }

      if (result.data === undefined) {
        return;
      }

      if (settlePromise) {
        settlePromise(result.data);
        settlePromise = null;
      } else {
        setData(result.data);
      }
    };

    var defaultedOptions = queryClient.defaultQueryObserverOptions(options);

    if (typeof defaultedOptions.staleTime !== 'number') {
      defaultedOptions.staleTime = 1000;
    }

    var observer = new reactQuery.InfiniteQueryObserver(queryClient, defaultedOptions);

    if (initialData === undefined && options.enabled !== false) {
      observer.fetchOptimistic(defaultedOptions).then(listener).catch(function (error) {
        return listener({
          error: error
        });
      });
    }

    dataAtom.onMount = function (update) {
      setData = update;
      var unsubscribe = observer == null ? void 0 : observer.subscribe(listener);

      if (options.enabled === false) {
        if (settlePromise) {
          settlePromise(undefined);
        } else {
          setData(undefined);
        }
      }

      return unsubscribe;
    };

    return {
      dataAtom: dataAtom,
      observer: observer,
      options: options
    };
  }, function (get, _set, action) {
    var _get2 = get(queryDataAtom),
        observer = _get2.observer;

    switch (action.type) {
      case 'refetch':
        {
          action.type;
              var options = _objectWithoutPropertiesLoose(action, _excluded);

          void observer.refetch(options);
          break;
        }

      case 'fetchPreviousPage':
        {
          void observer.fetchPreviousPage();
          break;
        }

      case 'fetchNextPage':
        {
          void observer.fetchNextPage();
          break;
        }
    }
  });
  var queryAtom = jotai.atom(function (get) {
    var _get3 = get(queryDataAtom),
        dataAtom = _get3.dataAtom;

    return get(dataAtom);
  }, function (_get, set, action) {
    set(queryDataAtom, action);
  });
  return queryAtom;
}

exports.atomWithInfiniteQuery = atomWithInfiniteQuery;
exports.atomWithQuery = atomWithQuery;
exports.queryClientAtom = queryClientAtom;
