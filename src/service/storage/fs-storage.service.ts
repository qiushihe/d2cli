import * as path from "path";
import * as R from "ramda";

import { sha256Digest } from "~src/helper/crypto.helper";
import { exists as fsExists } from "~src/helper/fs.helper";
import { isDirectory as fsIsDirectory } from "~src/helper/fs.helper";
import { recursiveRemove as fsRecursiveRemove } from "~src/helper/fs.helper";
import { readFile as fsReadFile } from "~src/helper/fs.helper";
import { writeFile as fsWriteFile } from "~src/helper/fs.helper";
import { makeDirectory as fsMakeDirectory } from "~src/helper/fs.helper";
import { AppModule } from "~src/module/app.module";
import { ConfigService } from "~src/service/config/config.service";

import { IStorageInterface, StorageFile } from "./storage.interface";

export class FsStorageService implements IStorageInterface {
  private readonly config: ConfigService;

  constructor() {
    this.config = AppModule.getDefaultInstance().resolve<ConfigService>("ConfigService");
  }

  async read<T>(filePath: string): Promise<[Error, null] | [null, StorageFile<T>]> {
    const storageRootErr = await this.ensureStorageRoot();
    if (storageRootErr) {
      return [storageRootErr, null];
    }

    const rawFilename = await sha256Digest(filePath);
    const rawFilePath = path.resolve(this.getStorageRootPath(), `${rawFilename}.json`);

    const [readFileErr, fileContent] = await fsReadFile(rawFilePath);
    if (readFileErr) {
      return [readFileErr, null];
    }

    let file: StorageFile<T>;
    try {
      file = JSON.parse(fileContent);
    } catch (err) {
      return [err as Error, null];
    }

    if (R.isNil(file.path) || R.isNil(file.content)) {
      return [new Error(`Invalid file content for ${filePath}`), null];
    }

    return [null, file];
  }

  async write<T>(file: StorageFile<T>): Promise<Error | null> {
    const storageRootErr = await this.ensureStorageRoot();
    if (storageRootErr) {
      return storageRootErr;
    }

    const rawFilename = await sha256Digest(file.path);
    const rawFilePath = path.resolve(this.getStorageRootPath(), `${rawFilename}.json`);

    return await fsWriteFile(rawFilePath, JSON.stringify(file, null, 2));
  }

  private async ensureStorageRoot(): Promise<Error | null> {
    const storageRootPath = this.getStorageRootPath();

    const [storageRootExistsErr, storageRootExists] = await fsExists(storageRootPath);
    if (storageRootExistsErr) {
      return storageRootExistsErr;
    }
    if (!storageRootExists) {
      const mkdirErr = await fsMakeDirectory(storageRootPath);
      if (mkdirErr) {
        return mkdirErr;
      }
    }

    const [storageRootIsDirectoryErr, storageRootIsDirectory] = await fsIsDirectory(
      storageRootPath
    );
    if (storageRootIsDirectoryErr) {
      return storageRootIsDirectoryErr;
    }
    if (!storageRootIsDirectory) {
      const rmErr = await fsRecursiveRemove(storageRootPath);
      if (rmErr) {
        return rmErr;
      }

      const mkdirErr = await fsMakeDirectory(storageRootPath);
      if (mkdirErr) {
        return mkdirErr;
      }
    }

    return null;
  }

  private getStorageRootPath(): string {
    return path.resolve(this.config.getRepoRootPath(), ".fs-storage");
  }
}
