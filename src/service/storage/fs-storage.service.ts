import { homedir } from "os";
import * as path from "path";

import { sha1Digest } from "~src/helper/crypto.helper";
import { exists as fsExists } from "~src/helper/fs.helper";
import { isDirectory as fsIsDirectory } from "~src/helper/fs.helper";
import { recursiveRemove as fsRecursiveRemove } from "~src/helper/fs.helper";
import { readFile as fsReadFile } from "~src/helper/fs.helper";
import { writeFile as fsWriteFile } from "~src/helper/fs.helper";
import { makeDirectory as fsMakeDirectory } from "~src/helper/fs.helper";
import { AppModule } from "~src/module/app.module";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";

import { IStorageInterface } from "./storage.types";
import { StorageFile } from "./storage.types";
import { StorageNamespace } from "./storage.types";

const _ns = (namespace: string, filename: string) => `${namespace}-${filename}`;

export class FsStorageService implements IStorageInterface {
  async read<T>(
    namespace: StorageNamespace,
    filePath: string
  ): Promise<[Error, null] | [null, StorageFile<T>]> {
    const storageRootErr = await this.ensureStorageRoot();
    if (storageRootErr) {
      return [storageRootErr, null];
    }

    const rawFilename = sha1Digest(filePath);
    const rawFilePath = path.resolve(
      this.getStorageRootPath(),
      _ns(namespace, `${rawFilename}.json`)
    );

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

    if (
      file.filename === null ||
      file.filename === undefined ||
      file.content === null ||
      file.content === undefined
    ) {
      return [new Error(`Invalid file content for ${filePath}`), null];
    }

    return [null, file];
  }

  async write<T>(namespace: StorageNamespace, file: StorageFile<T>): Promise<Error | null> {
    const storageRootErr = await this.ensureStorageRoot();
    if (storageRootErr) {
      return storageRootErr;
    }

    const rawFilename = sha1Digest(file.filename);
    const rawFilePath = path.resolve(
      this.getStorageRootPath(),
      _ns(namespace, `${rawFilename}.json`)
    );

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
    return path.resolve(homedir(), ".d2cli");
  }

  private getLogger(): Logger {
    return AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("FsStorageService");
  }
}
