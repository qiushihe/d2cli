export const fnWithSpinner = async <T>(message: string, fn: () => Promise<T>) => {
  console.log(message);
  const result = await fn();
  return result;
};
