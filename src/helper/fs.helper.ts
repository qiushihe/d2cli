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

export const recursiveRemove = async (path: string): Promise<Error | null> => {
  return new Promise<Error | null>((resolve) => {
    fs.rm(path, { recursive: true, force: true }, resolve);
  });
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
