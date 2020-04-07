////@ts-check
import { createAugmentedObservable } from "./collectionUtils";

/**
 * @typedef {Object} CollectionProxy

 * @property {function} computed - Indicates whether the Courage component is present.
 * @method {function} actions - Indicates whether the Courage component is present.
 * @method {function} init - Indicates whether the Courage component is present.
 */

/**
 * Creates a new CollectionBase. Used by the Collection function.
 * @class
 * @property {CollectionProxy} values
 * @property {function} notify
 * @property {CollectionProxy} notifyComputations
 * @property {CollectionProxy} values
 * @property {CollectionProxy} values
 * @property {CollectionProxy} values
 */
class CollectionBase {
  constructor() {
    /** @type {object[]} */
    this._listeners = [];
    this._computationListeners = [];
    this.observable = {
      values: createAugmentedObservable(
        this.notify.bind(this),
        this.actionNotify.bind(this)
      )
    };
    this.values = {};
    this._initialized = true;
  }

  notify() {
    if (this._initialized) {
      this._listeners.forEach(listener => {
        if (listener.computationInfo) {
          if (listener.computationInfo.arguments.length > 0) {
            listener.values(
              this.values[listener.computationInfo.computationName](
                ...listener.computationInfo.arguments
              )
            );
          } else {
            listener.values(
              this.values[listener.computationInfo.computationName]
            );
          }
        } else {
          listener.values(Object.keys(this.values));
        }
      });
    }
  }

  notifyComputations() {
    //why does this get called too many times?
    if (this._initialized) {
      this._computationListeners.forEach(listener => {
        if (listener.computationInfo) {
          if (listener.computationInfo.arguments.length > 0) {
            listener.values(
              this.values[listener.computationInfo.computationName](
                ...listener.computationInfo.arguments
              )
            );
          } else {
            listener.values(
              this.values[listener.computationInfo.computationName]
            );
          }
        }
      });
    }
  }

  entityListeners = {
    silent: true,
    values: this.notifyComputations.bind(this)
  };

  actionNotify(actionName, actionComplete) {
    if (this._initialized) {
      this._listeners.forEach(listener => {
        listener.actionHook(actionName, actionComplete);
      });
    }
  }

  registerComputation(listener) {
    this._computationListeners.push(listener);
    if (this._initialized) {
      if (listener.computationInfo) {
        if (listener.computationInfo.arguments.length > 0) {
          listener.values(
            this.values[listener.computationInfo.computationName](
              ...listener.computationInfo.arguments
            )
          );
        } else {
          listener.values(
            this.values[listener.computationInfo.computationName]
          );
        }
      }
    }
  }

  unregisterComputation(listener) {
    if (listener) {
      this._computationListeners = this._computationListeners.filter(
        o => o !== listener
      );
    }
  }

  register(listener) {
    this._listeners.push(listener);
    if (this._initialized) {
      listener.values(Object.keys(this.values));
    }
  }
  unregister(listener) {
    if (listener) {
      this._listeners = this._listeners.filter(o => o !== listener);
    }
  }

  registerWithEntity(entityId, listener) {
    //entity instances (aka values) have a handle called getDefinition() that will return the isntance backing those values
    Object.keys(this.values).forEach(id => {
      if (id === entityId) {
        this.values[id].getDefinition().register(listener);
      }
    });
  }
  unregisterWithEntity(entityId, listener) {
    Object.keys(this.values).forEach(id => {
      if (id === entityId) {
        this.values[id].getDefinition().unregister(listener);
      }
    });
  }
}

/**
 * Creates a Collection
 * @param {string} name The name of the collection to be used for referencing within observing components.
 * @param {EntityDefinition} entityDefinition A reference to an Entity definition to be contained within this Collection.
 * @returns {CollectionProxy} A functional mixin that accepts a Base Class definition and returns a ObservingCollection Class with the Base Class as its superclass
 */
const Collection = (name, entityDefinition) => {
  const collection = class extends CollectionBase {
    constructor() {
      super();

      this._entityDefinitionReference = entityDefinition;

      this.values = this.observable.values({});
      this.values.create = entityValues =>
        entityDefinition.new(entityValues, this.entityListeners);
      this.values.init = func => {
        const done = () => {
          this._initialized = true;
          this.notify();
        };
        if (!func) {
          done();
        } else {
          this._initialized = false;
          Promise.resolve(func(this.values)).then(() => {
            done();
          });
        }
        return this;
      };
    }
  };
  const instance = new collection();
  instance.name = name;
  return instance.values;
};

export default Collection;
