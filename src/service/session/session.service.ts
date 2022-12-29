import { AppModule } from "~src/module/app.module";
import { BungieOAuthAccessToken } from "~src/service/bungie-oauth/bungie-oauth.types";
import { ConfigService } from "~src/service/config/config.service";
import { FsStorageService } from "~src/service/storage/fs-storage.service";
import { IStorageInterface } from "~src/service/storage/storage.interface";
import { StorageFile } from "~src/service/storage/storage.interface";

import { SessionData } from "./session.types";
import { LoginStatus } from "./session.types";

export class SessionService {
  private readonly config: ConfigService;
  private readonly storageService: IStorageInterface;

  constructor() {
    this.config = AppModule.getDefaultInstance().resolve<ConfigService>("ConfigService");
    this.storageService =
      AppModule.getDefaultInstance().resolve<FsStorageService>("FsStorageService");
  }

  async getLoginStatus(): Promise<[Error, null] | [null, LoginStatus]> {
    const [reloadErr, sessionData] = await this.reload();
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

  async setBungieAccessToken(accessToken: BungieOAuthAccessToken): Promise<Error | null> {
    const [reloadErr, sessionFile] = await this.reloadFile();
    if (reloadErr) {
      return reloadErr;
    }

    sessionFile.content.bungleAccessToken = accessToken;

    const writeErr = await this.storageService.write(sessionFile);
    if (writeErr) {
      return writeErr;
    }

    return null;
  }

  async reload(): Promise<[Error, null] | [null, SessionData]> {
    const [reloadFileErr, sessionFile] = await this.reloadFile();
    if (reloadFileErr) {
      return [reloadFileErr, null];
    }

    return [null, sessionFile.content as SessionData];
  }

  private async reloadFile(): Promise<[Error, null] | [null, StorageFile<SessionData>]> {
    let path = "sessions/default.json";
    let sessionFile: StorageFile<SessionData>;

    const [readErr, file] = await this.storageService.read<SessionData>(path);
    if (readErr) {
      sessionFile = { path, content: {} };
    } else {
      sessionFile = file;
    }

    const writeErr = await this.storageService.write(sessionFile);
    if (writeErr) {
      return [writeErr, null];
    }

    return [null, sessionFile];
  }

  private getNowTime(): number {
    return new Date().getTime();
  }
}
