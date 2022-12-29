export type StorageFile<T> = {
  path: string;
  content: T;
};

export interface IStorageInterface {
  read<T>(filePath: string): Promise<[Error, null] | [null, StorageFile<T>]>;
  write<T>(file: StorageFile<T>): Promise<Error | null>;
}
