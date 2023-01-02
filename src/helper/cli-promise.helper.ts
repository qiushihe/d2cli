import ora from "ora";

export const fnWithSpinner = async <T>(message: string, fn: () => Promise<T>) => {
  const spinner = ora();

  spinner.start(message);
  const result = await fn();
  spinner.stop();

  return result;
};
