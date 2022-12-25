import { encode } from "js-base64";
import fetch, { Response } from "node-fetch";

import { ConfigService } from "~src/service/config/config.service";
import { BungieApi } from "~type/bungie-api";
import { D2QDB } from "~type/d2qdb";

export class BungieOauthService {
  private static defaultInstance: BungieOauthService;

  static getDefaultInstance(): BungieOauthService {
    if (!BungieOauthService.defaultInstance) {
      BungieOauthService.defaultInstance = new BungieOauthService();
    }
    return BungieOauthService.defaultInstance;
  }

  private config: ConfigService;

  constructor() {
    this.config = ConfigService.getDefaultInstance();
  }

  async getAccessToken(
    authorizationCode: string,
    startTime: number
  ): Promise<[Error, null] | [null, D2QDB.BungieOAuthAccessToken]> {
    const authorizationString = [
      this.config.getBungieOauthClientId(),
      this.config.getBungieOauthClientSecret()
    ].join(":");

    const authorizationToken = encode(authorizationString);

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

    const tokenResponse = (await res.json()) as BungieApi.OAuthAccessToken;

    const token = {
      type: tokenResponse.token_type,
      token: tokenResponse.access_token,
      expiredAt: startTime + tokenResponse.expires_in * 1000,
      refreshToken: undefined,
      refreshTokenExpiredAt: undefined,
      membershipId: tokenResponse.membership_id
    } as D2QDB.BungieOAuthAccessToken;

    if (tokenResponse.refresh_token) {
      token.refreshToken = tokenResponse.refresh_token;
    }

    if (tokenResponse.refresh_expires_in) {
      token.refreshTokenExpiredAt = startTime + tokenResponse.refresh_expires_in * 1000;
    }

    return [null, token];
  }
}
