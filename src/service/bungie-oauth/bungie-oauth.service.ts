import * as Base64 from "base64-js";
import fetch, { Response } from "node-fetch";

import { AppModule } from "~src/module/app.module";
import { ConfigService } from "~src/service/config/config.service";
import { AppConfigName } from "~src/service/config/config.types";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";

import { BungieApiOAuthAccessToken } from "./bungie-oauth.types";
import { BungieOAuthAccessToken } from "./bungie-oauth.types";

type GetOAuthTokenOptions = {
  type: "get-access-token" | "get-refreshed-token";
  startTime: number;
  authorizationCode?: string;
  refreshToken?: string;
};

export class BungieOauthService {
  private readonly config: ConfigService;

  constructor() {
    this.config = AppModule.getDefaultInstance().resolve<ConfigService>("ConfigService");
  }

  async getRefreshedAccessToken(
    refreshToken: string,
    startTime: number
  ): Promise<[Error, null] | [null, BungieOAuthAccessToken]> {
    return await this.getOAuthToken({
      type: "get-refreshed-token",
      startTime,
      refreshToken
    });
  }

  async getAccessToken(
    authorizationCode: string,
    startTime: number
  ): Promise<[Error, null] | [null, BungieOAuthAccessToken]> {
    return await this.getOAuthToken({
      type: "get-access-token",
      startTime,
      authorizationCode
    });
  }

  async getOAuthToken(
    options: GetOAuthTokenOptions
  ): Promise<[Error, null] | [null, BungieOAuthAccessToken]> {
    const logger = this.getLogger();

    let isGetAccessToken: boolean;
    if (options.type === "get-access-token") {
      isGetAccessToken = true;
    } else if (options.type === "get-refreshed-token") {
      isGetAccessToken = false;
    } else {
      return [new Error(`Unknown OAuth operation: ${options.type}`), null];
    }

    const [clientIdErr, clientId] = this.config.getAppConfig(AppConfigName.BungieOauthClientId);
    if (clientIdErr) {
      return [clientIdErr, null];
    }
    if (!clientId) {
      return [new Error("Missing Bungie OAuth client ID"), null];
    }

    const [clientSecretErr, clientSecret] = this.config.getAppConfig(
      AppConfigName.BungieOauthClientSecret
    );
    if (clientSecretErr) {
      return [clientSecretErr, null];
    }
    if (!clientSecret) {
      return [new Error("Missing Bungie OAuth client secret"), null];
    }

    const authorizationString = [clientId, clientSecret].join(":");
    const authorizationToken = Base64.fromByteArray(new TextEncoder().encode(authorizationString));

    let fields: string[];
    if (isGetAccessToken) {
      if (!options.authorizationCode) {
        return [new Error("Missing authorization code"), null];
      }

      fields = [
        "grant_type=authorization_code",
        `code=${encodeURIComponent(options.authorizationCode)}`
      ];
    } else {
      if (!options.refreshToken) {
        return [new Error("Missing refresh token"), null];
      }

      fields = [
        "grant_type=refresh_token",
        `refresh_token=${encodeURIComponent(options.refreshToken)}`
      ];
    }

    let res: Response;
    try {
      if (isGetAccessToken) {
        logger.debug(`Fetching Bungie.net OAuth access token ...`);
      } else {
        logger.debug(`Fetching Bungie.net OAuth refreshed access token ...`);
      }

      res = await fetch(this.config.getBungieOauthTokenRoot(), {
        method: "POST",
        headers: {
          Authorization: `Basic ${authorizationToken}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: fields.join("&")
      });
    } catch (err) {
      return [err as Error, null];
    }

    if (res.status !== 200) {
      return [
        new Error(
          `Get OAuth token returned unsuccessful status code: ${res.status} (${res.statusText})`
        ),
        null
      ];
    }

    const tokenResponse = (await res.json()) as BungieApiOAuthAccessToken;

    const token: BungieOAuthAccessToken = {
      type: tokenResponse.token_type,
      token: tokenResponse.access_token,
      expiredAt: options.startTime + tokenResponse.expires_in * 1000,
      refreshToken: undefined,
      refreshTokenExpiredAt: undefined,
      membershipId: tokenResponse.membership_id
    };

    if (tokenResponse.refresh_token) {
      token.refreshToken = tokenResponse.refresh_token;
    }

    if (tokenResponse.refresh_expires_in) {
      token.refreshTokenExpiredAt = options.startTime + tokenResponse.refresh_expires_in * 1000;
    }

    return [null, token];
  }

  private getLogger(): Logger {
    return AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("BungieOauthService");
  }
}
