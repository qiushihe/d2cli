import chalk from "chalk";
import fetch, { Response } from "node-fetch";

import { AppModule } from "~src/module/app.module";
import { CacheService } from "~src/service/cache/cache.service";
import { ConfigService } from "~src/service/config/config.service";
import { AppConfigName } from "~src/service/config/config.types";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";
import { SessionService } from "~src/service/session/session.service";
import { ApiResponse } from "~type/bungie-api.types";

// TODO: Implement handling of special rate limiting response logic.
//       > ThrottleSeconds will now be populated with an integer value of how many seconds you
//       > should wait to clear your particular throttle value. This will almost always be 10
//       > seconds in the current runtime config, as if you're getting throttled we're going to
//       > make you wait a full "cycle" for the request counters to clear. Applies to ErrorCodes
//       > PerApplicationThrottleExceeded, PerApplicationAuthenticatedThrottleExceeded,
//       > PerEndpointRequestThrottleExceeded,PerUserThrottleExceeded, and
//       > PerApplicationAnonymousThrottleExceeded. I also added a value called
//       > MaximumRequestsPerSecond that will indicate the approximate rate that will get you
//       > throttled to the exceptions MessageData dictionary. These changes will go live sometime in the beginning of March.
//       > ```
//       > {
//       >   "ErrorCode": 51,
//       >   "ThrottleSeconds": 0,
//       >   "ErrorStatus": "PerEndpointRequestThrottleExceeded",
//       >   "Message": "Too many platform requests per second.",
//       >   "MessageData": {}
//       > }

// The simplest for of Bungie.net API rate limit is 25 requests per second.
const LIMIT_REQUESTS_PER_SECOND = 25;
const LIMIT_REQUEST_WAIT_MULTIPLIER = 1.1;

type SendApiRequestOptions = {
  validateApiResponse?: <TResponse>(
    apiRes: ApiResponse<TResponse>
  ) => Promise<Error | null> | Error | null;
};

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

  async sendApiRequest<TBody = Record<string, unknown>, TResponse = any>(
    sessionId: string | null,
    method: string,
    path: string,
    body: TBody | null,
    options?: SendApiRequestOptions
  ): Promise<[Error, null] | [null, TResponse]> {
    const logger = this.getLogger();

    const [apiKeyErr, apiKey] = this.config.getAppConfig(AppConfigName.BungieApiKey);
    if (apiKeyErr) {
      return [apiKeyErr, null];
    }

    const requestHeader: Record<string, any> = {
      "X-API-Key": apiKey
    };

    if (sessionId) {
      const [upToDateAccessTokenErr, upToDateAccessToken] =
        await this.sessionService.getUpToDateAccessToken(sessionId);
      if (upToDateAccessTokenErr) {
        return [upToDateAccessTokenErr, null];
      }
      requestHeader["Authorization"] = `Bearer ${upToDateAccessToken}`;
    }

    logger.debug(`Sending request for session: ${sessionId} ...`);
    const [resErr, res] = await this.sendRequest(`${this.config.getBungieApiRoot()}${path}`, {
      method,
      "Content-Type": "application/json",
      headers: requestHeader,
      body: body ? JSON.stringify(body) : undefined
    });
    if (resErr) {
      return [resErr, null];
    }

    const [apiResErr, apiRes] = await this.extractApiResponse<TResponse>(res);
    if (apiResErr) {
      return [apiResErr, null];
    }
    if (options?.validateApiResponse) {
      const apiResErr = await options.validateApiResponse<TResponse>(apiRes);
      if (apiResErr) {
        return [apiResErr, null];
      }
      return [null, apiRes.Response as TResponse];
    } else {
      if (apiRes.Response === null || apiRes.Response === undefined) {
        return [new Error(`API response missing Response object`), null];
      }
      return [null, apiRes.Response];
    }
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

  async extractResponseJson(res: Response): Promise<[Error, null] | [null, any]> {
    let responseJson: any;
    try {
      responseJson = await res.json();
      return [null, responseJson];
    } catch (err) {
      return [err as Error, null];
    }
  }

  async sendRequest(url: string, options: any): Promise<[Error, null] | [null, Response]> {
    const logger = this.getLogger();

    try {
      const reqDescription = `${options.method} ${url} ${JSON.stringify(options.body)}`;
      logger.debug(`${chalk.bgMagenta(`Req`)} => ${reqDescription} ...`);
      const response = await this.fetch(url, options);
      logger.debug(
        `${chalk.magenta(`Res`)} => ${reqDescription} => ${response.status} (${
          response.statusText
        })`
      );
      return [null, response];
    } catch (err) {
      return [err as Error, null];
    }
  }

  private async fetch(url: string, options: any): Promise<Response> {
    const logger = this.getLogger();

    const rateLimitTimeout = 1000 / LIMIT_REQUESTS_PER_SECOND;
    const nowTime = new Date().getTime();
    const timeSinceLastRequest = nowTime - this.lastRequestTime;

    if (timeSinceLastRequest < rateLimitTimeout) {
      const waitTime = rateLimitTimeout * LIMIT_REQUEST_WAIT_MULTIPLIER;

      logger.debug(
        [
          `${chalk.red("Rate limit exceeded")} (${timeSinceLastRequest} < ${rateLimitTimeout}).`,
          `Waiting for ${waitTime}ms ...`
        ].join(" ")
      );

      await new Promise((resolve) => setTimeout(resolve, waitTime));
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
