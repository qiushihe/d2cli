import * as Base64 from "base64-js";
import fetch, { Response } from "node-fetch";

import { AppModule } from "~src/module/app.module";
import { BungieApiOAuthAccessToken } from "~src/service/bungie-api/bungie-api.types";
import { ConfigService } from "~src/service/config/config.service";

import { BungieOAuthAccessToken } from "./bungie-oauth.types";

export class BungieOauthService {
  private readonly config: ConfigService;

  constructor() {
    this.config = AppModule.getDefaultInstance().resolve<ConfigService>("ConfigService");
  }

  async getAccessToken(
    authorizationCode: string,
    startTime: number
  ): Promise<[Error, null] | [null, BungieOAuthAccessToken]> {
    const authorizationString = [
      this.config.getBungieOauthClientId(),
      this.config.getBungieOauthClientSecret()
    ].join(":");

    const authorizationToken = Base64.fromByteArray(new TextEncoder().encode(authorizationString));

    const fields = [
      "grant_type=authorization_code",
      `code=${encodeURIComponent(authorizationCode)}`
    ];

    let res: Response;
    try {
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
          `Get access token returned unsuccessful status code: ${res.status} (${res.statusText})`
        ),
        null
      ];
    }

    const tokenResponse = (await res.json()) as BungieApiOAuthAccessToken;

    const token: BungieOAuthAccessToken = {
      type: tokenResponse.token_type,
      token: tokenResponse.access_token,
      expiredAt: startTime + tokenResponse.expires_in * 1000,
      refreshToken: undefined,
      refreshTokenExpiredAt: undefined,
      membershipId: tokenResponse.membership_id
    };

    if (tokenResponse.refresh_token) {
      token.refreshToken = tokenResponse.refresh_token;
    }

    if (tokenResponse.refresh_expires_in) {
      token.refreshTokenExpiredAt = startTime + tokenResponse.refresh_expires_in * 1000;
    }

    return [null, token];
  }
}
