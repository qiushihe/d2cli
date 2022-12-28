import * as path from "path";

import { exists as fsExists } from "~src/helper/fs.helper";
import { isDirectory as fsIsDirectory } from "~src/helper/fs.helper";
import { recursiveRemove as fsRecursiveRemove } from "~src/helper/fs.helper";
import { readFile as fsReadFile } from "~src/helper/fs.helper";
import { writeFile as fsWriteFile } from "~src/helper/fs.helper";
import { makeDirectory as fsMakeDirectory } from "~src/helper/fs.helper";
import { AppModule } from "~src/module/app.module";
import { ConfigService } from "~src/service/config/config.service";
import { D2QDB } from "~type/d2qdb";

interface SessionData {
  bungleAccessToken?: D2QDB.BungieOAuthAccessToken | null;
}

const DATA_FILENAME = "data.json";

export class SessionService {
  private readonly config: ConfigService;

  constructor() {
    this.config = AppModule.getDefaultInstance().resolve<ConfigService>("ConfigService");
  }

  async setBungieAccessToken(accessToken: D2QDB.BungieOAuthAccessToken): Promise<Error | null> {
    const [sessionDataErr, sessionData] = await this.loadWithError(this.getSessionDataPath());
    if (sessionDataErr) {
      return sessionDataErr;
    }

    sessionData.bungleAccessToken = accessToken;

    const saveErr = await this.saveWithError(this.getSessionDataPath(), sessionData);
    if (saveErr) {
      return saveErr;
    }

    return null;
  }

  async reload(): Promise<[Error, null] | [null, SessionData]> {
    const [sessionExistsErr, sessionExists] = await fsExists(this.getSessionPath());
    if (sessionExistsErr) {
      return [sessionExistsErr, null];
    }
    if (!sessionExists) {
      const mkdirErr = await fsMakeDirectory(this.getSessionPath());
      if (mkdirErr) {
        return [mkdirErr, null];
      }
    }

    const [sessionIsDirectoryErr, sessionIsDirectory] = await fsIsDirectory(this.getSessionPath());
    if (sessionIsDirectoryErr) {
      return [sessionIsDirectoryErr, null];
    }
    if (!sessionIsDirectory) {
      const rmErr = await fsRecursiveRemove(this.getSessionPath());
      if (rmErr) {
        return [rmErr, null];
      }

      const mkdirErr = await fsMakeDirectory(this.getSessionPath());
      if (mkdirErr) {
        return [mkdirErr, null];
      }
    }

    const [sessionDataErr, sessionData] = await this.loadWithError(this.getSessionDataPath());
    if (sessionDataErr) {
      return [sessionDataErr, null];
    }
    const saveErr = await this.saveWithError(this.getSessionDataPath(), sessionData);
    if (saveErr) {
      return [saveErr, null];
    }

    return [null, sessionData];
  }

  private async saveWithError(path: string, sessionData: SessionData): Promise<Error | null> {
    return await fsWriteFile(path, JSON.stringify(sessionData, null, 2));
  }

  private async loadWithError(path: string): Promise<[Error, null] | [null, SessionData]> {
    let sessionDataString: string;
    const [sessionDataStringErr, dataString] = await fsReadFile(path);
    if (sessionDataStringErr) {
      return [sessionDataStringErr, null];
    } else {
      sessionDataString = dataString;
    }

    let sessionData: SessionData;
    try {
      sessionData = JSON.parse(sessionDataString);
    } catch (err) {
      return [err as Error, null];
    }

    return [null, sessionData];
  }

  private getSessionPath(): string {
    return path.resolve(this.config.getRepoRootPath(), ".session");
  }

  private getSessionDataPath(): string {
    return path.resolve(this.getSessionPath(), DATA_FILENAME);
  }
}
