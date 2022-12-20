import fetch, { Response } from "node-fetch";

import { ConfigService } from "~src/service/config/config.service";

type BungieApiResponse = {
  [key: string]: any;
  Response?: any;
  ErrorCode: number;
  ThrottleSeconds: number;
  ErrorStatus: string;
  Message: string;
  MessageData: any;
};

export class BungieService {
  private config: ConfigService;

  constructor() {
    this.config = ConfigService.getDefaultInstance();
  }

  async test() {
    console.log("!!! BungieService#test", "API Key", this.config.getBungieApiKey());

    const [reqErr, res] = await this.sendBungieRequest("GET", `/Destiny2/Manifest`, null);
    if (reqErr) {
      console.log("!!! reqErr", reqErr);
    } else {
      console.log("!!! res", "status", res.status);

      const [bungieResErr, bungieRes] = await this.extractBungieResponse(res);
      if (bungieResErr) {
        console.log("!!! bungieResErr", bungieResErr);
      } else {
        console.log("!!! bungieRes", JSON.stringify(bungieRes, null, 2));
      }
    }
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

  private async extractBungieResponse(
    res: Response
  ): Promise<[Error, null] | [null, BungieApiResponse]> {
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
        return [null, resJson as BungieApiResponse];
      }
    }
  }

  private async sendBungieRequest(
    method: string,
    path: string,
    body: Record<string, unknown> | null
  ): Promise<[Error, null] | [null, Response]> {
    try {
      const response = await this.sendRequest(`${this.config.getBungieApiRoot()}${path}`, {
        method,
        "Content-Type": "application/json",
        headers: {
          "X-API-Key": this.config.getBungieApiKey(),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return [null, response];
    } catch (err) {
      return [err as Error, null];
    }
  }

  private async extractResponseJson(res: Response): Promise<[Error, null] | [null, any]> {
    let responseJson: any;
    try {
      responseJson = await res.json();
      return [null, responseJson];
    } catch (err) {
      return [err as Error, null];
    }
  }

  private async extractResponseText(res: Response): Promise<[Error, null] | [null, string]> {
    let responseText: string;
    try {
      responseText = await res.text();
      return [null, responseText];
    } catch (err) {
      return [err as Error, null];
    }
  }

  private async sendRequest(url: string, options: any): Promise<Response> {
    return await fetch(url, options);
  }
}
