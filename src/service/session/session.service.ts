import { AppModule } from "~src/module/app.module";
import { BungieOauthService } from "~src/service/bungie-oauth/bungie-oauth.service";
import { OAuthAccessToken } from "~src/service/bungie-oauth/bungie-oauth.types";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";
import { FsStorageService } from "~src/service/storage/fs-storage.service";
import { IStorageInterface } from "~src/service/storage/storage.types";
import { StorageNamespace } from "~src/service/storage/storage.types";
import { StorageFile } from "~src/service/storage/storage.types";

import { SessionData } from "./session.types";
import { SessionDataName } from "./session.types";
import { LoginStatus } from "./session.types";
import { TokenStatus } from "./session.types";

export const DEFAULT_SESSION_ID = "default";

export class SessionService {
  private readonly storageService: IStorageInterface;
  private readonly bungieOauthService: BungieOauthService;

  constructor() {
    this.storageService =
      AppModule.getDefaultInstance().resolve<FsStorageService>("FsStorageService");
    this.bungieOauthService =
      AppModule.getDefaultInstance().resolve<BungieOauthService>("BungieOauthService");
  }

  async getUpToDateAccessToken(sessionId: string): Promise<[Error, null] | [null, string]> {
    const logger = this.getLogger();

    const [accessTokenErr, accessToken] = await this.getData<OAuthAccessToken>(
      sessionId,
      SessionDataName.BungieAccessToken
    );
    if (accessTokenErr) {
      return [accessTokenErr, null];
    }
    if (!accessToken) {
      return [new Error(`Missing access token for session: ${sessionId}`), null];
    }

    const tokenStatus = this.getTokenStatus(accessToken);

    if (tokenStatus.isAccessTokenExpired) {
      logger.debug(`Access token expired`);

      if (accessToken.refreshToken) {
        logger.debug(`Refresh token present`);

        if (tokenStatus.isRefreshTokenExpired) {
          return [
            new Error(
              `Refresh token expired for session: ${sessionId}; Unable to refresh access token`
            ),
            null
          ];
        } else {
          logger.debug(`Refresh token valid`);

          const [refreshTokenErr, refreshedToken] =
            await this.bungieOauthService.getRefreshedAccessToken(
              accessToken.refreshToken,
              this.getNowTime()
            );
          if (refreshTokenErr) {
            return [refreshTokenErr, null];
          }
          if (!refreshedToken) {
            return [new Error(`Refreshed token missing for session: ${sessionId}`), null];
          }

          logger.debug(`Storing refreshing access token ...`);
          const setTokenErr = await this.setData<OAuthAccessToken>(
            sessionId,
            SessionDataName.BungieAccessToken,
            refreshedToken
          );
          if (setTokenErr) {
            return [
              logger.loggedError(`Unable to store refreshed access token: ${setTokenErr.message}`),
              null
            ];
          }

          return [null, refreshedToken.token];
        }
      } else {
        return [
          new Error(
            `Missing refresh token for session: ${sessionId}; Unable to refresh access token`
          ),
          null
        ];
      }
    } else {
      logger.debug(`Access token still valid`);
      return [null, accessToken.token];
    }
  }

  async getLoginStatus(sessionId: string): Promise<[Error, null] | [null, LoginStatus]> {
    const logger = this.getLogger();

    const status: LoginStatus = { isLoggedIn: false, isLoginExpired: false };

    const [accessTokenErr, accessToken] = await this.getData<OAuthAccessToken>(
      sessionId,
      SessionDataName.BungieAccessToken
    );
    if (accessTokenErr) {
      return [accessTokenErr, null];
    }

    if (accessToken) {
      const tokenStatus = this.getTokenStatus(accessToken);

      if (tokenStatus.isAccessTokenExpired) {
        if (accessToken.refreshToken) {
          if (tokenStatus.isRefreshTokenExpired) {
            logger.debug(`Access token expired; Refresh token expired`);
            status.isLoggedIn = true;
            status.isLoginExpired = true;
          } else {
            logger.debug(`Access token expired; Refresh token still valid`);
            status.isLoggedIn = true;
            status.isLoginExpired = false;
          }
        } else {
          logger.debug(`Access token expired; Refresh token missing`);
          status.isLoggedIn = true;
          status.isLoginExpired = true;
        }
      } else {
        logger.debug(`Access token still valid`);
        status.isLoggedIn = true;
        status.isLoginExpired = false;
      }
    }

    return [null, status];
  }

  async getBungieNetMembershipId(sessionId: string): Promise<[Error, null] | [null, string]> {
    const [accessTokenErr, accessToken] = await this.getData<OAuthAccessToken>(
      sessionId,
      SessionDataName.BungieAccessToken
    );
    if (accessTokenErr) {
      return [accessTokenErr, null];
    }

    if (!accessToken) {
      return [new Error(`Missing Bungie OAuth access token for session: ${sessionId}`), null];
    }

    return [null, accessToken.membershipId];
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

  async setData<T>(
    sessionId: string,
    name: SessionDataName,
    data: T | null
  ): Promise<Error | null> {
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

  private getTokenStatus(token: OAuthAccessToken): TokenStatus {
    const status: TokenStatus = {
      isAccessTokenExpired: false,
      isRefreshTokenExpired: false
    };

    if (token.expiredAt && token.expiredAt <= this.getNowTime()) {
      if (token.refreshTokenExpiredAt) {
        if (token.refreshTokenExpiredAt <= this.getNowTime()) {
          status.isAccessTokenExpired = true;
          status.isRefreshTokenExpired = true;
        } else {
          status.isAccessTokenExpired = true;
          status.isRefreshTokenExpired = false;
        }
      } else {
        status.isAccessTokenExpired = true;
      }
    }

    return status;
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
