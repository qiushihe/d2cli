import fetch, { Response } from "node-fetch";

import { AppModule } from "~src/module/app.module";
import { ConfigService } from "~src/service/config/config.service";
import { BungieApi } from "~type/bungie-api";
import { D2QDB } from "~type/d2qdb";

export class BungieService {
  private readonly config: ConfigService;

  constructor() {
    this.config = AppModule.getDefaultInstance().resolve<ConfigService>("ConfigService");
  }

  async test() {
    console.log("!!! BungieService#test", "API Key", this.config.getBungieApiKey());

    const [membershipsErr, memberships] = await this.getDestiny2Memberships("28547862");
    if (membershipsErr) {
      console.log("!!! membershipsErr", membershipsErr);
    } else {
      const membership = memberships[0];
      console.log("!!! membership", membership);

      const [charactersErr, characters] = await this.getDestiny2Characters(membership);
      if (charactersErr) {
        console.log("!!! charactersErr", charactersErr);
      } else {
        console.log("!!! characters", characters);
      }
    }
  }

  async getDestiny2Characters(
    membership: D2QDB.Destiny2Membership
  ): Promise<[Error, null] | [null, D2QDB.Destiny2Character[]]> {
    const [profileErr, profileRes] = await this.sendBungieRequest(
      "GET",
      `/Destiny2/${membership.type}/Profile/${membership.id}?components=${BungieApi.ComponentType.Characters}`,
      null
    );
    if (profileErr) {
      return [profileErr, null];
    } else {
      const [profileJsonErr, profileJson] =
        await this.extractBungieResponse<BungieApi.Destiny2Profile>(profileRes);
      if (profileJsonErr) {
        return [profileJsonErr, null];
      } else {
        if (!profileJson.Response) {
          return [new Error("Profile missing response data"), null];
        }
        if (!profileJson.Response.characters) {
          return [new Error("Profile missing characters data"), null];
        }

        const charactersData = profileJson.Response.characters.data;
        const characters = Object.keys(charactersData).map<D2QDB.Destiny2Character>(
          (characterId) => {
            const character = charactersData[characterId];
            return { id: character.characterId, lightLevel: character.light };
          }
        );

        return [null, characters];
      }
    }
  }

  async getDestiny2Memberships(
    bungieNetMembershipId: string
  ): Promise<[Error, null] | [null, D2QDB.Destiny2Membership[]]> {
    const [bungieNetUserErr, bungieNetUserRes] = await this.sendBungieRequest(
      "GET",
      `/User/GetBungieNetUserById/${bungieNetMembershipId}`,
      null
    );
    if (bungieNetUserErr) {
      return [bungieNetUserErr, null];
    }

    const [bungieNetUserJsonErr, bungieNetUserJson] = await this.extractBungieResponse(
      bungieNetUserRes
    );
    if (bungieNetUserJsonErr) {
      return [bungieNetUserJsonErr, null];
    }

    const uniqueName = bungieNetUserJson.Response.uniqueName.split("#", 2);

    const [searchDestinyPlayersErr, searchDestinyPlayersRes] = await this.sendBungieRequest(
      "POST",
      `/Destiny2/SearchDestinyPlayerByBungieName/All`,
      { displayName: uniqueName[0], displayNameCode: uniqueName[1] }
    );
    if (searchDestinyPlayersErr) {
      return [searchDestinyPlayersErr, null];
    }

    const [searchDestinyPlayersJsonErr, searchDestinyPlayersJson] =
      await this.extractBungieResponse<BungieApi.Destiny2Membership[]>(searchDestinyPlayersRes);
    if (searchDestinyPlayersJsonErr) {
      return [searchDestinyPlayersJsonErr, null];
    }
    if (!searchDestinyPlayersJson.Response) {
      return [new Error("Missing response in Destiny 2 players search result."), null];
    }

    const effectiveMemberships = searchDestinyPlayersJson.Response.filter((membership) => {
      return membership.applicableMembershipTypes.includes(membership.crossSaveOverride);
    });

    const destiny2Memberships = effectiveMemberships.map<D2QDB.Destiny2Membership>((membership) => {
      return {
        type: membership.membershipType,
        id: membership.membershipId,
        displayName: [
          membership.bungieGlobalDisplayName,
          membership.bungieGlobalDisplayNameCode
        ].join("#")
      };
    });

    return [null, destiny2Memberships];
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

  private async extractBungieResponse<TResponse = any>(
    res: Response
  ): Promise<[Error, null] | [null, BungieApi.Destiny2ApiResponse<TResponse>]> {
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
        return [null, resJson as BungieApi.Destiny2ApiResponse<TResponse>];
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
          "X-API-Key": this.config.getBungieApiKey()
        },
        body: body ? JSON.stringify(body) : undefined
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
