import { AppModule } from "~src/module/app.module";
import { BungieMembershipService } from "~src/service/bungie-membership/bungie-membership.service";
import { Destiny2ComponentDataService } from "~src/service/destiny2-component-data/destiny2-component-data.service";
import { resolveProfileCharacters } from "~src/service/destiny2-component-data/profile.resolver";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";
import { SessionService } from "~src/service/session/session.service";
import { DestinyCharacterComponent } from "~type/bungie-api/destiny/entities/characters.types";

export class CharacterService {
  private readonly sessionService: SessionService;
  private readonly bungieNetMembershipService: BungieMembershipService;
  private readonly destiny2ComponentDataService: Destiny2ComponentDataService;

  constructor() {
    this.sessionService = AppModule.getDefaultInstance().resolve<SessionService>("SessionService");

    this.bungieNetMembershipService =
      AppModule.getDefaultInstance().resolve<BungieMembershipService>("BungieMembershipService");

    this.destiny2ComponentDataService =
      AppModule.getDefaultInstance().resolve<Destiny2ComponentDataService>(
        "Destiny2ComponentDataService"
      );
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
      await this.bungieNetMembershipService.getDestiny2Membership(bungieNetMembershipId);
    if (membershipErr) {
      return [membershipErr, null];
    }

    const [charactersComponentsErr, charactersComponents] =
      await this.destiny2ComponentDataService.getProfileComponentsData(
        sessionId,
        membershipInfo.membership.membershipType,
        membershipInfo.membership.membershipId,
        resolveProfileCharacters
      );
    if (charactersComponentsErr) {
      return [charactersComponentsErr, null];
    }

    return [null, charactersComponents];
  }

  private getLogger(): Logger {
    return AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("CharacterService");
  }
}
