import { AppModule } from "~src/module/app.module";
import { BungieOAuthAccessToken } from "~src/service/bungie-oauth/bungie-oauth.types";
import { ConfigService } from "~src/service/config/config.service";
import { FsStorageService } from "~src/service/storage/fs-storage.service";
import { IStorageInterface } from "~src/service/storage/storage.types";
import { StorageNamespace } from "~src/service/storage/storage.types";
import { StorageFile } from "~src/service/storage/storage.types";

import { SessionData } from "./session.types";
import { LoginStatus } from "./session.types";

export const DEFAULT_SESSION_ID = "default";

export class SessionService {
  private readonly config: ConfigService;
  private readonly storageService: IStorageInterface;

  constructor() {
    this.config = AppModule.getDefaultInstance().resolve<ConfigService>("ConfigService");
    this.storageService =
      AppModule.getDefaultInstance().resolve<FsStorageService>("FsStorageService");
  }

  async getLoginStatus(sessionId: string): Promise<[Error, null] | [null, LoginStatus]> {
    const [reloadErr, sessionData] = await this.reload(sessionId);
    if (reloadErr) {
      return [reloadErr, null];
    }

    const status: LoginStatus = { isLoggedIn: false, isLoginExpired: false };

    const accessToken = sessionData.bungleAccessToken;
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

  async setBungieAccessToken(
    sessionId: string,
    accessToken: BungieOAuthAccessToken
  ): Promise<Error | null> {
    const [reloadErr, sessionFile] = await this.reloadFile(sessionId);
    if (reloadErr) {
      return reloadErr;
    }

    sessionFile.content.bungleAccessToken = accessToken;

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
    let filename = `session-${sessionId}.json`;
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
}
