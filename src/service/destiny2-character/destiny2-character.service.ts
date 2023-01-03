import { AppModule } from "~src/module/app.module";
import { BungieApiService } from "~src/service/bungie-api/bungie.api.service";
import { BungieApiComponentType } from "~src/service/bungie-api/bungie-api.types";
import { Destiny2MembershipService } from "~src/service/destiny2-membership/destiny2-membership.service";
import { BungieApiDestiny2ProfileResponse } from "~src/service/destiny2-profile/destiny2-profile.types";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";
import { SessionService } from "~src/service/session/session.service";

import { BungieApiDestiny2CharacterComponent } from "./destiny2-character.types";

export class Destiny2CharacterService {
  private readonly sessionService: SessionService;
  private readonly bungieApiService: BungieApiService;
  private readonly destiny2MembershipService: Destiny2MembershipService;

  constructor() {
    this.sessionService = AppModule.getDefaultInstance().resolve<SessionService>("SessionService");
    this.bungieApiService =
      AppModule.getDefaultInstance().resolve<BungieApiService>("BungieApiService");
    this.destiny2MembershipService =
      AppModule.getDefaultInstance().resolve<Destiny2MembershipService>(
        "Destiny2MembershipService"
      );
  }

  async getDestiny2Characters(
    sessionId: string
  ): Promise<[Error, null] | [null, BungieApiDestiny2CharacterComponent[]]> {
    const [bungieNetMembershipIdErr, bungieNetMembershipId] =
      await this.sessionService.getBungieNetMembershipId(sessionId);
    if (bungieNetMembershipIdErr) {
      return [bungieNetMembershipIdErr, null];
    }

    const [membershipErr, membershipInfo] =
      await this.destiny2MembershipService.getBungieNetDestiny2Membership(bungieNetMembershipId);
    if (membershipErr) {
      return [membershipErr, null];
    }

    return await this.getDestiny2CharactersByMembership(
      sessionId,
      membershipInfo.membership.membershipType,
      membershipInfo.membership.membershipId
    );
  }

  async getDestiny2CharactersByMembership(
    sessionId: string,
    membershipType: number,
    membershipId: string
  ): Promise<[Error, null] | [null, BungieApiDestiny2CharacterComponent[]]> {
    const logger = this.getLogger();

    logger.debug(`Fetching characters ...`);
    const [profileErr, profileRes] = await this.bungieApiService.sendSessionApiRequest(
      sessionId,
      "GET",
      `/Destiny2/${membershipType}/Profile/${membershipId}?components=${BungieApiComponentType.Characters}`,
      null
    );
    if (profileErr) {
      return [profileErr, null];
    } else {
      const [profileJsonErr, profileJson] =
        await this.bungieApiService.extractApiResponse<BungieApiDestiny2ProfileResponse>(
          profileRes
        );
      if (profileJsonErr) {
        return [profileJsonErr, null];
      } else {
        if (!profileJson.Response) {
          return [new Error("Profile missing response data"), null];
        }
        if (!profileJson.Response.characters) {
          return [new Error("Profile missing characters data"), null];
        }

        return [null, Object.values(profileJson.Response.characters.data)];
      }
    }
  }

  private getLogger(): Logger {
    return AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("Destiny2CharacterService");
  }
}
