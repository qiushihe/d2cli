import * as fs from "fs";

import { promisedFn } from "~src/helper/promise.helper";

const existsSync = (path: string): ErrorXOR<boolean> => {
  try {
    fs.openSync(path, "r");
    return [null, true];
  } catch (err) {
    if ((err as any).code === "ENOENT") {
      return [null, false];
    } else {
      return [err as Error, null];
    }
  }
};

const isDirectorySync = (path: string): ErrorXOR<boolean> => {
  try {
    const stats = fs.lstatSync(path);
    return [null, stats.isDirectory()];
  } catch (err) {
    return [err as Error, null];
  }
};

const recursiveRemoveSync = (path: string): Error | null => {
  try {
    fs.rmSync(path, { recursive: true, force: true });
    return null;
  } catch (err) {
    return err as Error;
  }
};

const makeDirectorySync = (path: string): Error | null => {
  try {
    fs.mkdirSync(path, { recursive: true });
    return null;
  } catch (err) {
    return err as Error;
  }
};

export const ensureDirectoryExistSync = (directoryPath: string): Error | null => {
  const [directoryExistsErr, directoryExists] = existsSync(directoryPath);
  if (directoryExistsErr) {
    return directoryExistsErr;
  }
  if (!directoryExists) {
    const mkdirErr = makeDirectorySync(directoryPath);
    if (mkdirErr) {
      return mkdirErr;
    }
  }

  const [directoryIsDirectoryErr, directoryIsDirectory] = isDirectorySync(directoryPath);
  if (directoryIsDirectoryErr) {
    return directoryIsDirectoryErr;
  }
  if (!directoryIsDirectory) {
    const rmErr = recursiveRemoveSync(directoryPath);
    if (rmErr) {
      return rmErr;
    }

    const mkdirErr = makeDirectorySync(directoryPath);
    if (mkdirErr) {
      return mkdirErr;
    }
  }

  return null;
};

export const writeFile = async (path: string, content: string): Promise<ErrorXOR<void>> => {
  return promisedFn(() => fs.promises.writeFile(path, content, "utf8"));
};

export const readFile = async (path: string): Promise<ErrorXOR<string>> => {
  return promisedFn(() => fs.promises.readFile(path, "utf8"));
};
