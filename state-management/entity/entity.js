import { recursivelyObserve } from "./entityUtils";

/*
  Why would entities need deep observability?
  I guess it would be helpful for collections of things that are not in the db? need to revisit that

*/

class EntityBase {
  constructor() {
    this._listeners = [];
    this.observable = {
      values: recursivelyObserve(
        this.notify.bind(this),
        this.actionNotify.bind(this),
        true
      )
    };
    this.values = {};
    this._initialized = true;
  }

  notify(standalone) {
    if (this._initialized) {
      if (standalone) {
        this._listeners
          .filter(listener => !listener.silent)
          .forEach(listener => {
            listener.values(this.values, "notify");
          });
        return;
      }
      this._listeners.forEach(listener => {
        listener.values(this.values, "notify");
      });
    }
  }

  actionNotify(actionName, actionComplete) {
    if (this._initialized) {
      this._listeners.forEach(listener => {
        listener.actionHook(actionName, actionComplete);
      });
    }
  }

  register(listener) {
    this._listeners.push(listener);
    if (this._initialized && !listener.silent) {
      listener.values(this.values, "on register");
    }
  }
  unregister(listener) {
    if (listener) {
      this._listeners = this._listeners.filter(o => o !== listener);
    }
  }
}

/*
  the definition of an Entity's subclass needs to include what computations and actions it will have
  what fucking computations would an entity have??? i guess
*/

const Entity = (name, values) => {
  const entity = class extends EntityBase {
    constructor(createdValues) {
      super();
      if (createdValues) {
        this.values = this.observable.values(createdValues);
      } else {
        this.values = this.observable.values(values);
      }
      this.values.getDefinition = () => this;

      this.values.init = func => {
        const done = () => {
          this._initialized = true;
          //need this to call for standalone but not if created from inside a collection
          this.notify(true);
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
      //this can be given extra args to do something with
      //if use it to take a listener in for the containing collection
      //it will get called on any change
      //and can then call all computation listeners
      this.new = (vals, collectionListener) => {
        //need to somehow while doing this register the collection as a listener?
        //any of these values changing should cause collection computations to re-run
        const ent = new entity(vals);
        ent.name = name;
        ent.register(collectionListener);
        //need to ensure what im doing here isnt whack with memory
        if (this.values._definitionComputations) {
          ent.values.computations(this.values._definitionComputations);
        }
        if (this.values._definitionActions) {
          ent.values.actions(this.values._definitionActions);
        }
        ent.values.init();
        return ent.values;
      };
    }
  };
  const instance = new entity();
  instance.name = name;
  return instance.values;
};

export default Entity;
