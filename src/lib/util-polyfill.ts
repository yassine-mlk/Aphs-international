// Polyfill pour les fonctions manquantes de 'util' dont simple-peer a besoin
export const debuglog = (name: string) => {
  return (...args: any[]) => {
    // console.log(`[${name}]`, ...args);
  };
};

export const inspect = (obj: any, options: any) => {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (e) {
    return String(obj);
  }
};

export const inherits = (ctor: any, superCtor: any) => {
  if (superCtor) {
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  }
};

export default {
  debuglog,
  inspect,
  inherits
};
