import * as fs from "fs";

export const exists = async (path: string): Promise<[Error, null] | [null, boolean]> => {
  return new Promise<[Error, null] | [null, boolean]>((resolve) => {
    fs.open(path, (err) => {
      if (err) {
        if (err.code === "ENOENT") {
          resolve([null, false]);
        } else {
          resolve([err, null]);
        }
      } else {
        resolve([null, true]);
      }
    });
  });
};

export const existsSync = (path: string): [Error, null] | [null, boolean] => {
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

export const isFile = async (path: string): Promise<[Error, null] | [null, boolean]> => {
  return new Promise<[Error, null] | [null, boolean]>((resolve) => {
    fs.lstat(path, (err, stats) => {
      if (err) {
        resolve([err, null]);
      } else {
        resolve([null, stats.isFile()]);
      }
    });
  });
};

export const isDirectory = async (path: string): Promise<[Error, null] | [null, boolean]> => {
  return new Promise<[Error, null] | [null, boolean]>((resolve) => {
    fs.lstat(path, (err, stats) => {
      if (err) {
        resolve([err, null]);
      } else {
        resolve([null, stats.isDirectory()]);
      }
    });
  });
};

export const isDirectorySync = (path: string): [Error, null] | [null, boolean] => {
  try {
    const stats = fs.lstatSync(path);
    return [null, stats.isDirectory()];
  } catch (err) {
    return [err as Error, null];
  }
};

export const recursiveRemove = async (path: string): Promise<Error | null> => {
  return new Promise<Error | null>((resolve) => {
    fs.rm(path, { recursive: true, force: true }, resolve);
  });
};

export const recursiveRemoveSync = (path: string): Error | null => {
  try {
    fs.rmSync(path, { recursive: true, force: true });
    return null;
  } catch (err) {
    return err as Error;
  }
};

export const writeFile = async (path: string, content: string): Promise<Error | null> => {
  return new Promise<Error | null>((resolve) => {
    fs.writeFile(path, content, "utf8", resolve);
  });
};

export const readFile = async (path: string): Promise<[Error, null] | [null, string]> => {
  return new Promise<[Error, null] | [null, string]>((resolve) => {
    fs.readFile(path, "utf8", (err, data) => {
      if (err) {
        resolve([err, null]);
      } else {
        resolve([null, data]);
      }
    });
  });
};

export const makeDirectory = async (path: string): Promise<Error | null> => {
  return new Promise<Error | null>((resolve) => {
    fs.mkdir(path, { recursive: true }, resolve);
  });
};

export const makeDirectorySync = (path: string): Error | null => {
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
