import { AppModule } from "~src/module/app.module";
import { FsStorageService } from "~src/service/storage/fs-storage.service";
import { IStorageInterface } from "~src/service/storage/storage.types";
import { StorageNamespace } from "~src/service/storage/storage.types";
import { StorageFile } from "~src/service/storage/storage.types";

import { CacheData } from "./cache.types";

export class CacheService {
  private readonly memCache: Record<string, StorageFile<CacheData>>;
  private readonly storageService: IStorageInterface;

  constructor() {
    this.memCache = {};
    this.storageService = AppModule.getDefaultInstance().resolve(FsStorageService);
  }

  async get<T>(namespace: string, key: string): Promise<ErrorXOR<T | null>> {
    const memCachedFile = this.memCache[namespace];
    if (memCachedFile) {
      const cacheExpiry = memCachedFile.content.expiredAtInMilliseconds;
      const cacheValue = memCachedFile.content.data[key] as T | null;

      if (cacheExpiry === null) {
        return [null, cacheValue];
      } else if (cacheExpiry > this.getNowTime()) {
        return [null, cacheValue];
      } else {
        delete this.memCache[namespace];
      }
    }

    const [reloadFileErr, cacheFile] = await this.reloadFile(namespace);
    if (reloadFileErr) {
      return [reloadFileErr, null];
    }

    const cacheExpiry = cacheFile.content.expiredAtInMilliseconds;
    const cacheValue = cacheFile.content.data[key] as T | null;

    if (cacheExpiry === null) {
      delete this.memCache[namespace];
      this.memCache[namespace] = cacheFile;
      return [null, cacheValue];
    } else if (cacheExpiry > this.getNowTime()) {
      delete this.memCache[namespace];
      this.memCache[namespace] = cacheFile;
      return [null, cacheValue];
    } else {
      delete this.memCache[namespace];
      return [null, null];
    }
  }

  async set<T>(
    namespace: string,
    key: string,
    value: T,
    expiresInMilliseconds: number | null
  ): Promise<ErrorXOR<void>> {
    const [reloadFileErr, cacheFile] = await this.reloadFile(namespace);
    if (reloadFileErr) {
      return [reloadFileErr, null];
    }

    cacheFile.content.data[key] = value;
    cacheFile.content.expiredAtInMilliseconds = null;

    if (expiresInMilliseconds) {
      cacheFile.content.expiredAtInMilliseconds = this.getNowTime() + expiresInMilliseconds;
    }

    const [writeErr] = await this.storageService.write(StorageNamespace.CACHE, cacheFile);
    if (writeErr) {
      return [writeErr, null];
    }

    delete this.memCache[namespace];
    this.memCache[namespace] = cacheFile;

    return [null, undefined];
  }

  private async reloadFile(namespace: string): Promise<ErrorXOR<StorageFile<CacheData>>> {
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

    const [writeErr] = await this.storageService.write(StorageNamespace.CACHE, cacheFile);
    if (writeErr) {
      return [writeErr, null];
    }

    return [null, cacheFile];
  }

  private getNowTime(): number {
    return new Date().getTime();
  }
}
