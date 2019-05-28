/**
 * Method decorator that logs each call, including arguments, return value, exceptions and promise resolve/reject if asynchronous.
 */
export function logging<T extends (...args: any[]) => any>(target: any, name: string, descriptor: TypedPropertyDescriptor<T>)
  : TypedPropertyDescriptor<T> {
  if (!descriptor.value) {
    return descriptor;
  }
  const value = descriptor.value;

  return {
    value(this: any, ...args: Parameters<T>) {
      const call = `call ${this.constructor.name}.${name}(${args.join(', ')})`;
      console.log(`${call}...`);
      let result: ReturnType<T>;
      try {
        result = value.apply(this, args);
      } catch (e) {
        console.log(`${call} threw ${e}`);
        throw e;
      }

      if (typeof result === 'object' && result !== null && 'then' in result) {
        console.log(`${call} awaiting result`);
        (async () => {
          try {
            const resultValue = await result;
            console.log(`${call} resolved ${resultValue}`);
          } catch (e) {
            console.log(`${call} rejected ${e}`);
          }
        })();
      } else {
        console.log(`call ${this.constructor.name}.${name}(${args}) returned ${result}`);
      }
      return result;
    }
  } as TypedPropertyDescriptor<T>;
}
