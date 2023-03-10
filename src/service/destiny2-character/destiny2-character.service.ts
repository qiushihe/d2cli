import { AppModule } from "~src/module/app.module";
import { BungieApiService } from "~src/service/bungie-api/bungie.api.service";
import { Destiny2MembershipService } from "~src/service/destiny2-membership/destiny2-membership.service";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";
import { SessionService } from "~src/service/session/session.service";
import { DestinyComponentType } from "~type/bungie-api/destiny.types";
import { DestinyCharacterComponent } from "~type/bungie-api/destiny/entities/characters.types";
import { DestinyCharacterProgressionComponent } from "~type/bungie-api/destiny/entities/characters.types";
import { DestinyProfileResponse } from "~type/bungie-api/destiny/responses";
import { DestinyCharacterResponse } from "~type/bungie-api/destiny/responses";

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

  async getCharacterProgressions(
    sessionId: string,
    membershipType: number,
    membershipId: string,
    characterId: string
  ): Promise<[Error, null] | [null, DestinyCharacterProgressionComponent]> {
    const logger = this.getLogger();

    logger.debug(`Fetching character progressions ...`);
    const [characterErr, characterRes] = await this.bungieApiService.sendSessionApiRequest(
      sessionId,
      "GET",
      `/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}?components=${DestinyComponentType.CharacterProgressions}`,
      null
    );
    if (characterErr) {
      return [characterErr, null];
    }

    const [characterJsonErr, characterJson] =
      await this.bungieApiService.extractApiResponse<DestinyCharacterResponse>(characterRes);
    if (characterJsonErr) {
      return [characterJsonErr, null];
    }
    if (!characterJson.Response) {
      return [new Error("Response missing data"), null];
    }
    if (!characterJson.Response.progressions) {
      return [new Error("Response missing character progressions data"), null];
    }

    return [null, characterJson.Response.progressions.data];
  }

  async getCharacter(
    sessionId: string,
    membershipType: number,
    membershipId: string,
    characterId: string
  ): Promise<[Error, null] | [null, DestinyCharacterComponent]> {
    const logger = this.getLogger();

    logger.debug(`Fetching character ...`);
    const [characterErr, characterRes] = await this.bungieApiService.sendSessionApiRequest(
      sessionId,
      "GET",
      `/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}?components=${DestinyComponentType.Characters}`,
      null
    );
    if (characterErr) {
      return [characterErr, null];
    }

    const [characterJsonErr, characterJson] =
      await this.bungieApiService.extractApiResponse<DestinyCharacterResponse>(characterRes);
    if (characterJsonErr) {
      return [characterJsonErr, null];
    }
    if (!characterJson.Response) {
      return [new Error("Response missing data"), null];
    }
    if (!characterJson.Response.character) {
      return [new Error("Response missing character data"), null];
    }

    return [null, characterJson.Response.character.data];
  }

  async getCharacters(
    sessionId: string
  ): Promise<[Error, null] | [null, DestinyCharacterComponent[]]> {
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

    return await this.getCharactersByMembership(
      sessionId,
      membershipInfo.membership.membershipType,
      membershipInfo.membership.membershipId
    );
  }

  async getCharactersByMembership(
    sessionId: string,
    membershipType: number,
    membershipId: string
  ): Promise<[Error, null] | [null, DestinyCharacterComponent[]]> {
    const logger = this.getLogger();

    logger.debug(`Fetching characters ...`);
    const [profileErr, profileRes] = await this.bungieApiService.sendSessionApiRequest(
      sessionId,
      "GET",
      `/Destiny2/${membershipType}/Profile/${membershipId}?components=${DestinyComponentType.Characters}`,
      null
    );
    if (profileErr) {
      return [profileErr, null];
    }

    const [profileJsonErr, profileJson] =
      await this.bungieApiService.extractApiResponse<DestinyProfileResponse>(profileRes);
    if (profileJsonErr) {
      return [profileJsonErr, null];
    }

    if (!profileJson.Response) {
      return [new Error("Response missing data"), null];
    }
    if (!profileJson.Response.characters) {
      return [new Error("Response missing characters data"), null];
    }

    return [null, Object.values(profileJson.Response.characters.data)];
  }

  private getLogger(): Logger {
    return AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("Destiny2CharacterService");
  }
}
