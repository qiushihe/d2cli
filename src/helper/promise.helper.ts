export const promisedFn = async <T>(promiseFn: () => Promise<T>): Promise<ErrorXOR<T>> => {
  try {
    return [null, await promiseFn()];
  } catch (err) {
    return [err as Error, null];
  }
};
