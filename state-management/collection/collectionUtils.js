export const createAugmentedObservable = (
  notificationMethod,
  actionHook
) => target => {
  let computations = {};
  //let computationsCache = {};
  let actions = {};
  let deferredActions = [];
  let beingAccessedByAction = false;
  const proxy = new Proxy(target, {
    ownKeys(obj) {
      const _privateKeys = ["computed", "actions", "init", "create"];
      const allKeys = Reflect.ownKeys(obj);
      return allKeys.filter(key => {
        return !_privateKeys.includes(key);
      });
    },
    get(obj, key) {
      // if (computationsCache[key]) {
      //   return computationsCache[key];
      // }
      const comp = computations[key];
      if (comp) {
        if (typeof comp === "function") {
          return (...args) => {
            return comp(...args);
          };
        }
        // computationsCache[key] = comp;
        return comp;
      }
      if (actions[key]) {
        return (...args) => {
          // computationsCache = {};
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
      obj[key] = value;
      if (!beingAccessedByAction) {
        notificationMethod();
      }
      return true;
    }
  });
  proxy.computed = func => {
    computations = func(proxy);
    return proxy;
  };
  proxy.actions = func => {
    actions = func(proxy);
    return proxy;
  };
  return proxy;
};
