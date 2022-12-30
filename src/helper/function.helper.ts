export const triedFn = <T>(tryFn: () => T): [Error, null] | [null, T] => {
  try {
    return [null, tryFn()];
  } catch (err) {
    return [err as Error, null];
  }
};
