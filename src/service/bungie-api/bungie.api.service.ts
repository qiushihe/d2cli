import fetch, { Response } from "node-fetch";

import { AppModule } from "~src/module/app.module";
import { CacheService } from "~src/service/cache/cache.service";
import { ConfigService } from "~src/service/config/config.service";
import { AppConfigName } from "~src/service/config/config.types";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";
import { SessionService } from "~src/service/session/session.service";
import { ApiResponse } from "~type/bungie-api.types";

const LIMIT_REQUESTS_PER_SECOND = 10;

export class BungieApiService {
  private readonly config: ConfigService;
  private readonly sessionService: SessionService;
  private readonly cacheService: CacheService;
  private lastRequestTime: number;

  constructor() {
    this.config = AppModule.getDefaultInstance().resolve<ConfigService>("ConfigService");
    this.sessionService = AppModule.getDefaultInstance().resolve<SessionService>("SessionService");
    this.cacheService = AppModule.getDefaultInstance().resolve<CacheService>("CacheService");
    this.lastRequestTime = 0;
  }

  // ThrottleSeconds will now be populated with an integer value of how many seconds you should wait to clear your
  // particular throttle value. This will almost always be 10 seconds in the current runtime config, as if you're
  // getting throttled we're going to make you wait a full "cycle" for the request counters to clear. Applies to
  // ErrorCodes PerApplicationThrottleExceeded, PerApplicationAuthenticatedThrottleExceeded,
  // PerEndpointRequestThrottleExceeded,PerUserThrottleExceeded, and PerApplicationAnonymousThrottleExceeded.
  // I also added a value called MaximumRequestsPerSecond that will indicate the approximate rate that will get you
  // throttled to the exceptions MessageData dictionary. These changes will go live sometime in the beginning of March.
  // {
  //   "ErrorCode": 51,
  //   "ThrottleSeconds": 0,
  //   "ErrorStatus": "PerEndpointRequestThrottleExceeded",
  //   "Message": "Too many platform requests per second.",
  //   "MessageData": {}
  // }

  async sendSessionApiRequest<TBody = Record<string, unknown>>(
    sessionId: string,
    method: string,
    path: string,
    body: TBody | null
  ): Promise<[Error, null] | [null, Response]> {
    const logger = this.getLogger();

    const [upToDateAccessTokenErr, upToDateAccessToken] =
      await this.sessionService.getUpToDateAccessToken(sessionId);
    if (upToDateAccessTokenErr) {
      return [upToDateAccessTokenErr, null];
    }

    const [apiKeyErr, apiKey] = this.config.getAppConfig(AppConfigName.BungieApiKey);
    if (apiKeyErr) {
      return [apiKeyErr, null];
    }

    logger.debug(`Sending request for session: ${sessionId} ...`);
    return await this.sendRequest(`${this.config.getBungieApiRoot()}${path}`, {
      method,
      "Content-Type": "application/json",
      headers: {
        Authorization: `Bearer ${upToDateAccessToken}`,
        "X-API-Key": apiKey
      },
      body: body ? JSON.stringify(body) : undefined
    });
  }

  async sendApiRequest(
    method: string,
    path: string,
    body: Record<string, unknown> | null
  ): Promise<[Error, null] | [null, Response]> {
    const logger = this.getLogger();

    const [apiKeyErr, apiKey] = this.config.getAppConfig(AppConfigName.BungieApiKey);
    if (apiKeyErr) {
      return [apiKeyErr, null];
    }

    logger.debug(`Sending request without session ...`);
    return await this.sendRequest(`${this.config.getBungieApiRoot()}${path}`, {
      method,
      "Content-Type": "application/json",
      headers: {
        "X-API-Key": apiKey
      },
      body: body ? JSON.stringify(body) : undefined
    });
  }

  async extractApiResponse<TResponse = any>(
    res: Response
  ): Promise<[Error, null] | [null, ApiResponse<TResponse>]> {
    const [resJsonErr, resJson] = await this.extractResponseJson(res);
    if (resJsonErr) {
      return [resJsonErr, null];
    } else {
      const resJsonKeys = Object.keys(resJson);
      if (
        !resJsonKeys.includes("ErrorCode") ||
        !resJsonKeys.includes("ThrottleSeconds") ||
        !resJsonKeys.includes("ErrorStatus") ||
        !resJsonKeys.includes("Message") ||
        !resJsonKeys.includes("MessageData")
      ) {
        return [new Error(`Invalid Bungie API response: ${JSON.stringify(resJson)}`), null];
      } else {
        return [null, resJson as ApiResponse<TResponse>];
      }
    }
  }

  async sendRequest(url: string, options: any): Promise<[Error, null] | [null, Response]> {
    const logger = this.getLogger();

    try {
      const reqDescription = `${options.method} ${url} ${JSON.stringify(options.body)}`;
      logger.debug(`Req => ${reqDescription} ...`);
      const response = await this.fetch(url, options);
      logger.debug(`Res => ${reqDescription} => ${response.status} (${response.statusText})`);
      return [null, response];
    } catch (err) {
      return [err as Error, null];
    }
  }

  async extractResponseError(res: Response): Promise<Error | null> {
    if (res.status < 200 || res.status > 299) {
      const genericMessage = `Unable to extract error message for response status: ${res.status} ${res.statusText}`;

      const [extractJsonResErr, jsonRes] = await this.extractResponseJson(res);
      if (extractJsonResErr) {
        const [extractTextResErr, textRes] = await this.extractResponseText(res);
        if (extractTextResErr) {
          return new Error(genericMessage);
        } else {
          return new Error(textRes);
        }
      } else {
        return new Error(jsonRes.Message || genericMessage);
      }
    } else {
      return null;
    }
  }

  async extractResponseJson(res: Response): Promise<[Error, null] | [null, any]> {
    let responseJson: any;
    try {
      responseJson = await res.json();
      return [null, responseJson];
    } catch (err) {
      return [err as Error, null];
    }
  }

  async extractResponseText(res: Response): Promise<[Error, null] | [null, string]> {
    let responseText: string;
    try {
      responseText = await res.text();
      return [null, responseText];
    } catch (err) {
      return [err as Error, null];
    }
  }

  private async fetch(url: string, options: any): Promise<Response> {
    const logger = this.getLogger();

    const rateLimitTimeout = 1000 / LIMIT_REQUESTS_PER_SECOND;
    const nowTime = new Date().getTime();
    const timeSinceLastRequest = nowTime - this.lastRequestTime;

    if (timeSinceLastRequest > rateLimitTimeout) {
      logger.debug(`Rate limit exceeded. Waiting for ${rateLimitTimeout}ms ...`);
      await new Promise((resolve) => setTimeout(resolve, rateLimitTimeout));
    }

    const fetchResult = await fetch(url, options);
    this.lastRequestTime = new Date().getTime();
    return fetchResult;
  }

  private getLogger(): Logger {
    return AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("BungieApiService");
  }
}
