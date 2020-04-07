import { track } from "lwc";

/**
 * Allows a component to observe a collection. The component will get a new value at a property with the same name as the Collection definition's name.
 * The component will be 'rendered' whenever the computations length changes.
 * @param {Collection} collectionRef An actual reference to the definition of the collection you want to observe
 * @returns {function} A functional mixin that accepts a Base Class definition and returns a ObservingCollection Class with the Base Class as its superclass
 */
export const ObserveCollection = collectionRef => {
  const collectionName = collectionRef.name;
  return base =>
    class ObservingCollection extends base {
      [`${collectionName}Ref`] = collectionRef;
      @track _collection = [];
      get [collectionName]() {
        return this._collection;
      }
      get [`${collectionName}HasValues`]() {
        return this[collectionName].length > 0;
      }
      loadingAsyncValue = false;

      [`${collectionName}Listeners`] = {
        values: valueObj => {
          if (valueObj.length !== this._collection.length) {
            this._collection = valueObj;
          }
        },
        actionHook: (actionName, actionCompletion) => {
          this[`on${collectionName}Action`](actionName, actionCompletion);
        }
      };
      /* eslint no-unused-vars: 0*/
      async [`on${collectionName}Action`](actionName, actionCompletion) {
        /*
        `actionName` is the name of the action in the store that's about to run
        `actionCompletion` is a promise that will resolve once the action is complete
        */
        this.loadingAsyncValue = true;
        await actionCompletion;
        this.loadingAsyncValue = false;
      }

      connectedCallback() {
        if (super.connectedCallback) {
          super.connectedCallback();
        }
        this[`${collectionName}Ref`].register(
          this[`${collectionName}Listeners`]
        );
      }

      disconnectedCallback() {
        if (super.disconnectedCallback) {
          super.disconnectedCallback();
        }
        this[`${collectionName}Ref`].unregister(
          this[`${collectionName}Listeners`]
        );
      }
    };
};

/**
 * Allows a component to observe a computation of a collection.The component will get a new value at a property with the same name as the Collection definition's name.
 * and be 'rendered' whenever the observed computations length changes. The computation is re-evaluated
 * anytime an Entity in the collection changes.
 * @param {Collection} collectionRef An actual reference to the collection with the computation you want to observe
 * @param {string} computationName The name of the computation this component should observe. This will be the name of the property on your class where you can access the computation
 * @param {string} [argsLocation=[]] Computations can be getters or functions, if observing a function computation store an array of arguments at this key and they will be passed in sequence to the function
 * @returns {function} A functional mixin that accepts a Base Class definition and returns a ObservingCollectionComputation Class with the Base Class as its superclass
 */
export const ObserveCollectionComputation = (
  collectionRef,
  computationName,
  argsLocation
) => {
  //argsLocation must contain an array of arguments if it is going to exist
  const collectionName = collectionRef.name;
  return base =>
    class ObservingCollectionComputation extends base {
      [`${collectionName}Ref`] = collectionRef;
      @track _collectionComputation = [];
      get [computationName]() {
        return this._collectionComputation;
      }
      get [`${computationName}HasValues`]() {
        return this[computationName].length > 0;
      }
      loadingAsyncValue = false;

      [`${computationName}Listeners`] = {
        computationInfo: {
          computationName,
          arguments: [...(this[argsLocation] ? this[argsLocation] : [])]
        },
        values: valueObj => {
          if (valueObj.length !== this._collectionComputation.length) {
            this._collectionComputation = valueObj;
          }
        },
        actionHook: (actionName, actionCompletion) => {
          this[`on${collectionName}Action`](actionName, actionCompletion);
        }
      };
      /* eslint no-unused-vars: 0*/
      async [`on${computationName}Action`](actionName, actionCompletion) {
        /*
        `actionName` is the name of the action in the store that's about to run
        `actionCompletion` is a promise that will resolve once the action is complete
        */
        this.loadingAsyncValue = true;
        await actionCompletion;
        this.loadingAsyncValue = false;
      }

      connectedCallback() {
        if (super.connectedCallback) {
          super.connectedCallback();
        }
        this[`${collectionName}Ref`].registerComputation(
          this[`${computationName}Listeners`]
        );
      }

      disconnectedCallback() {
        if (super.disconnectedCallback) {
          super.disconnectedCallback();
        }
        this[`${collectionName}Ref`].unregisterComputation(
          this[`${computationName}Listeners`]
        );
      }
    };
};

//this only to be used for entities that exist outside of a collection where the definition itself is the Entity
//should improve the nomenclature here and maybe have those be a different type of entity

/**
 * This callback type is called `predicate` and is used to provide finer-grained re-render controls when observing an Entity.
 *
 * @callback predictate
 * @param {Object} previousEntityValues
 * @param {Object} latestEntityValues
 * @returns {Boolean} Indicating whether or not to call render on the observing component
 */

/**
 * Allows a component to observe a standalone entity. The component will get a new value at a property with the same name as the Entity definition's name.
 * The component will be 'rendered' whenever the observed Entity changes at any depth.
 * @param {EntityDefinition} entityDefinition An actual reference to the Entity definition. Cannot have been created used Entity.new().
 * @param {predicate} [predicate=()=>true] For providing finer grained control over when to re-render. A callback receiving old and new versions of the entity and returning a boolean indicating if component should re-render.
 * @returns {function} A functional mixin that accepts a Base Class definition and returns a ObservingCollectionComputation Class with the Base Class as its superclass
 */
export const ObserveEntity = (entityDefinition, predicate = () => true) => {
  //the entityRef has to an actual entity definition, not one created using Entity.new()
  const entityName = entityDefinition.name;
  return base =>
    class ObservingEntity extends base {
      [`${entityName}Ref`] = entityDefinition;
      @track _entity = {};
      get [entityName]() {
        return this._entity;
      }
      get [`is${entityName}Loaded`]() {
        return Object.keys(this._entity).length > 0;
      }
      loadingAsyncValue = false;

      [`${entityName}Listeners`] = {
        values: valueObj => {
          if (predicate(valueObj)) {
            this._entity = valueObj;
          }
        },
        actionHook: (actionName, actionCompletion) => {
          this[`on${entityName}Action`](actionName, actionCompletion);
        }
      };
      /* eslint no-unused-vars: 0*/
      async [`on${entityName}Action`](actionName, actionCompletion) {
        /*
    `actionName` is the name of the action in the store that's about to run
    `actionCompletion` is a promise that will resolve once the action is complete
    */
        this.loadingAsyncValue = true;
        await actionCompletion;
        this.loadingAsyncValue = false;
      }

      connectedCallback() {
        if (super.connectedCallback) {
          super.connectedCallback();
        }
        this[`${entityName}Ref`].register(this[`${entityName}Listeners`]);
      }

      disconnectedCallback() {
        if (super.disconnectedCallback) {
          super.disconnectedCallback();
        }
        this[`${entityName}Ref`].unregister(this[`${entityName}Listeners`]);
      }
    };
};
/**
 * Allows a component to observe an entity from within a collection. The component will get a new value at a property with the same name as the Entity definition's name.
 * The component will be 'rendered' whenever the observed Entity changes at any depth.
 * @param {Collection} collectionRef An actual reference to the collection that contains the Entity you want to observe
 * @param {String} idKey The name of the class property that will contain the id used to find the Entity within the Collection
 * @param {predicate} [predicate=()=>true] For providing finer grained control over when to re-render. A callback receiving old and new versions of the entity and returning a boolean indicating if component should re-render.
 * @returns {function} A functional mixin that accepts a Base Class definition and returns a ObservingCollectionComputation Class with the Base Class as its superclass
 */
export const ObserveEntityFromCollection = (
  collectionRef,
  idKey,
  predicate = () => true
) => {
  const entityName = collectionRef._entityDefinitionReference.name;
  return base =>
    class ObservingEntityFromCollection extends base {
      [`${entityName}CollectionRef`] = collectionRef;
      //so this should basically never be undefined on initial setup because this mixin should only be used with a known id?
      @track _entities = { [entityName]: {} };
      get [entityName]() {
        return this._entities[entityName];
      }
      get [`is${entityName}Loaded`]() {
        return this[entityName] !== undefined;
      }
      loadingAsyncValue = false;

      [`${entityName}Listeners`] = {
        values: valueObj => {
          if (predicate(valueObj)) {
            this._entities = {
              ...this._entities,
              [entityName]: valueObj
            };
          }
        },
        actionHook: (actionName, actionCompletion) => {
          this[`on${entityName}Action`](actionName, actionCompletion);
        }
      };
      /* eslint no-unused-vars: 0*/
      async [`on${entityName}Action`](actionName, actionCompletion) {
        /*
        `actionName` is the name of the action in the store that's about to run
        `actionCompletion` is a promise that will resolve once the action is complete
        */
        this.loadingAsyncValue = true;
        await actionCompletion;
        this.loadingAsyncValue = false;
      }

      connectedCallback() {
        if (super.connectedCallback) {
          super.connectedCallback();
        }
        this[`${entityName}CollectionRef`].registerWithEntity(
          this[idKey],
          this[`${entityName}Listeners`]
        );
      }

      disconnectedCallback() {
        if (super.disconnectedCallback) {
          super.disconnectedCallback();
        }
        this[`${entityName}CollectionRef`].unregisterWithEntity(
          this[idKey],
          this[`${entityName}Listeners`]
        );
      }
    };
};

////////

export const WithStore = storeRef => {
  const storeName = storeRef.name;
  return base =>
    class Augmented extends base {
      [`${storeName}Ref`] = storeRef;
      _storesList = [];
      _internalStoreValue = {};
      loadingAsyncValue = false;

      get [storeName]() {
        return this._internalStoreValue[storeName];
      }

      get [`is${storeName}Loaded`]() {
        return this[storeName] !== undefined;
      }
      get allStoresLoaded() {
        return this._storesList.reduce((allLoaded, name) => {
          return allLoaded && this[`is${name}Loaded`];
        }, true);
      }

      [`on${storeName}Change`](valueObj) {
        //
      }

      [`${storeName}Listeners`] = {
        values: valueObj => {
          // Object.mapper(valueObj);
          // this._internalStoreValue = {
          //   ...this._internalStoreValue,
          //   [storeName]: valueObj
          // };
        },
        actionHook: (actionName, actionCompletion) => {
          this[`on${storeName}Action`](actionName, actionCompletion);
        }
      };
      /* eslint no-unused-vars: 0*/
      async [`on${storeName}Action`](actionName, actionCompletion) {
        /*
      `actionName` is the name of the action in the store that's about to run
      `actionCompletion` is a promise that will resolve once the action is complete
      */
        this.loadingAsyncValue = true;
        await actionCompletion;
        this.loadingAsyncValue = false;
      }

      connectedCallback() {
        if (super.connectedCallback) {
          super.connectedCallback();
        }
        this[`${storeName}Ref`].register(
          this[`on${storeName}Change`].bind(this)
        );
        this._storesList = [...this._storesList, storeName];
      }

      disconnectedCallback() {
        if (super.disconnectedCallback) {
          super.disconnectedCallback();
        }
        this[`${storeName}Ref`].unregister(
          this[`on${storeName}Change`].bind(this)
        );
      }
    };
};
