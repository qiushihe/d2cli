import { AppModule } from "~src/module/app.module";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";
import { FsStorageService } from "~src/service/storage/fs-storage.service";
import { IStorageInterface } from "~src/service/storage/storage.types";
import { StorageNamespace } from "~src/service/storage/storage.types";
import { StorageFile } from "~src/service/storage/storage.types";

import { CacheData } from "./cache.types";

// TODO: Implement in-memory caching to bypass FS access to avoid spending too much time reading
//       extremely large manifest files.

export class CacheService {
  private readonly storageService: IStorageInterface;

  constructor() {
    this.storageService =
      AppModule.getDefaultInstance().resolve<FsStorageService>("FsStorageService");
  }

  async get<T>(namespace: string, key: string): Promise<[Error, null] | [null, T | null]> {
    const [reloadFileErr, cacheFile] = await this.reloadFile(namespace);
    if (reloadFileErr) {
      return [reloadFileErr, null];
    }

    const cacheExpiry = cacheFile.content.expiredAtInMilliseconds;
    const cacheValue = cacheFile.content.data[key] as T | null;

    if (cacheExpiry === null) {
      return [null, cacheValue];
    } else if (cacheExpiry > this.getNowTime()) {
      return [null, cacheValue];
    } else {
      return [null, null];
    }
  }

  async set<T>(
    namespace: string,
    key: string,
    value: T,
    expiresInMilliseconds: number | null
  ): Promise<Error | null> {
    const [reloadFileErr, cacheFile] = await this.reloadFile(namespace);
    if (reloadFileErr) {
      return reloadFileErr;
    }

    cacheFile.content.data[key] = value;
    cacheFile.content.expiredAtInMilliseconds = null;

    if (expiresInMilliseconds) {
      cacheFile.content.expiredAtInMilliseconds = this.getNowTime() + expiresInMilliseconds;
    }

    const writeErr = await this.storageService.write(StorageNamespace.CACHE, cacheFile);
    if (writeErr) {
      return writeErr;
    }

    return null;
  }

  private async reloadFile(
    namespace: string
  ): Promise<[Error, null] | [null, StorageFile<CacheData>]> {
    const filename = `cache-${namespace}.json`;
    let cacheFile: StorageFile<CacheData>;

    const [readErr, file] = await this.storageService.read<CacheData>(
      StorageNamespace.CACHE,
      filename
    );
    if (readErr) {
      cacheFile = { filename, content: { data: {}, expiredAtInMilliseconds: null } };
    } else {
      cacheFile = file;
    }

    const writeErr = await this.storageService.write(StorageNamespace.CACHE, cacheFile);
    if (writeErr) {
      return [writeErr, null];
    }

    return [null, cacheFile];
  }

  private getNowTime(): number {
    return new Date().getTime();
  }

  private getLogger(): Logger {
    return AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("CacheService");
  }
}
