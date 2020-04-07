//TODO: reduce calling to compy notify, i think the setting of helper vals are cuasing a problem with that
//check that a similar problem isnt happening with the collection general notify as well

const createPlainObservable = (
  observerMethod,
  notificationMethod
) => target => {
  return new Proxy(target, {
    get(obj, key) {
      return obj[key];
    },
    set(obj, key, value) {
      obj[key] = observerMethod(value);
      notificationMethod();
      return true;
    }
  });
};

const createAugmentedObservable = (
  childObserverMethod,
  notificationMethod,
  actionHook
) => target => {
  let computations = {};
  let computationsCache = {};
  let actions = {};
  let deferredActions = [];
  let beingAccessedByAction = false;
  const proxy = new Proxy(target, {
    get(obj, key) {
      if (computationsCache[key]) {
        return computationsCache[key];
      }
      const comp = computations[key];
      if (comp) {
        if (typeof comp === "function") {
          return (...args) => {
            return comp(...args);
          };
        }
        computationsCache[key] = comp;
        return comp;
      }
      if (actions[key]) {
        return (...args) => {
          computationsCache = {};
          if (beingAccessedByAction) {
            deferredActions.push({
              actionKey: key,
              arguments: [...args]
            });
            return;
          }
          proxy._actionStart = true;
          /* eslint no-unused-vars: 0*/
          const actionComplete = new Promise((resolve, _) => {
            Promise.resolve(actions[key](...args)).then(() => {
              resolve();
              if (deferredActions.length > 0) {
                proxy._actionEnd = true;
                let actionObj = deferredActions.pop();
                proxy[actionObj.actionKey](...actionObj.arguments);
              } else {
                proxy._actionEndNotify = true;
              }
            });
          });
          actionHook(key, actionComplete);
        };
      }
      return obj[key];
    },
    set(obj, key, value) {
      if (
        key === "_definitionComputations" ||
        key === "_definitionActions" ||
        key === "getDefinition"
      ) {
        obj[key] = value;
        return true;
      }
      if (key === "_actionStart") {
        beingAccessedByAction = true;
        return true;
      }
      if (key === "_actionEnd") {
        beingAccessedByAction = false;
        return true;
      }
      if (key === "_actionEndNotify") {
        beingAccessedByAction = false;
        notificationMethod();
        return true;
      }
      obj[key] = childObserverMethod(value);
      if (!beingAccessedByAction) {
        notificationMethod();
      }
      return true;
    }
  });
  proxy.computed = func => {
    computations = func(proxy);
    proxy._definitionComputations = func;
    return proxy;
  };
  proxy.actions = func => {
    actions = func(proxy);
    proxy._definitionActions = func;
    return proxy;
  };
  return proxy;
};

export function recursivelyObserve(notificationMethod, actionHook, augment) {
  return targetObject => {
    const checkObservability = value =>
      typeof value === "object" && value !== null && !Array.isArray(value);
    const observeWithPlain = recursivelyObserve(
      notificationMethod,
      actionHook,
      false
    );

    const plainObservable = createPlainObservable(
      observeWithPlain,
      notificationMethod
    );

    const augmentedObservable = createAugmentedObservable(
      observeWithPlain,
      notificationMethod,
      actionHook
    );

    if (checkObservability(targetObject)) {
      const targetCopy = Object.assign({}, targetObject);
      Object.keys(targetObject).forEach(innerKey => {
        if (checkObservability(targetObject[innerKey])) {
          targetCopy[innerKey] = plainObservable(targetCopy[innerKey]);
        }
      });
      if (augment) {
        return augmentedObservable(targetCopy);
      }
      return plainObservable(targetCopy);
    }
    return targetObject;
  };
}
