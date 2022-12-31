import { AppModule } from "~src/module/app.module";
import { BungieOAuthAccessToken } from "~src/service/bungie-oauth/bungie-oauth.types";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";
import { FsStorageService } from "~src/service/storage/fs-storage.service";
import { IStorageInterface } from "~src/service/storage/storage.types";
import { StorageNamespace } from "~src/service/storage/storage.types";
import { StorageFile } from "~src/service/storage/storage.types";

import { SessionData } from "./session.types";
import { SessionDataName } from "./session.types";
import { LoginStatus } from "./session.types";

export const DEFAULT_SESSION_ID = "default";

export class SessionService {
  private readonly storageService: IStorageInterface;

  constructor() {
    this.storageService =
      AppModule.getDefaultInstance().resolve<FsStorageService>("FsStorageService");
  }

  async getLoginStatus(sessionId: string): Promise<[Error, null] | [null, LoginStatus]> {
    const status: LoginStatus = { isLoggedIn: false, isLoginExpired: false };

    const [accessTokenErr, accessToken] = await this.getData<BungieOAuthAccessToken>(
      sessionId,
      SessionDataName.BungieAccessToken
    );
    if (accessTokenErr) {
      return [accessTokenErr, null];
    }

    if (accessToken) {
      status.isLoggedIn = true;

      if (accessToken.expiredAt && accessToken.expiredAt <= this.getNowTime()) {
        if (accessToken.refreshTokenExpiredAt) {
          if (accessToken.refreshTokenExpiredAt <= this.getNowTime()) {
            status.isLoginExpired = true;
          }
        } else {
          status.isLoginExpired = true;
        }
      }
    }

    return [null, status];
  }

  async getData<T>(
    sessionId: string,
    name: SessionDataName
  ): Promise<[Error, null] | [null, T | null]> {
    const [reloadErr, sessionFile] = await this.reloadFile(sessionId);
    if (reloadErr) {
      return [reloadErr, null];
    }

    return [null, sessionFile.content[name] as T | null];
  }

  async setData(sessionId: string, name: SessionDataName, data: any): Promise<Error | null> {
    const [reloadErr, sessionFile] = await this.reloadFile(sessionId);
    if (reloadErr) {
      return reloadErr;
    }

    sessionFile.content[name] = data;

    const writeErr = await this.storageService.write(StorageNamespace.SESSIONS, sessionFile);
    if (writeErr) {
      return writeErr;
    }

    return null;
  }

  async reload(sessionId: string): Promise<[Error, null] | [null, SessionData]> {
    const [reloadFileErr, sessionFile] = await this.reloadFile(sessionId);
    if (reloadFileErr) {
      return [reloadFileErr, null];
    }

    return [null, sessionFile.content as SessionData];
  }

  private async reloadFile(
    sessionId: string
  ): Promise<[Error, null] | [null, StorageFile<SessionData>]> {
    const filename = `session-${sessionId}.json`;
    let sessionFile: StorageFile<SessionData>;

    const [readErr, file] = await this.storageService.read<SessionData>(
      StorageNamespace.SESSIONS,
      filename
    );
    if (readErr) {
      sessionFile = { filename, content: {} };
    } else {
      sessionFile = file;
    }

    const writeErr = await this.storageService.write(StorageNamespace.SESSIONS, sessionFile);
    if (writeErr) {
      return [writeErr, null];
    }

    return [null, sessionFile];
  }

  private getNowTime(): number {
    return new Date().getTime();
  }

  private getLogger(): Logger {
    return AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("SessionService");
  }
}
