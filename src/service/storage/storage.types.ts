export enum StorageNamespace {
  SESSIONS = "SESSIONS",
  CACHE = "CACHE"
}

export type StorageFile<T> = {
  filename: string;
  content: T;
};

export interface IStorageInterface {
  read<T>(namespace: StorageNamespace, filePath: string): Promise<ErrorXOR<StorageFile<T>>>;

  write<T>(namespace: StorageNamespace, file: StorageFile<T>): Promise<ErrorXOR<void>>;
}
