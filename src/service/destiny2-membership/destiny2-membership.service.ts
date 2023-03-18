import { AppModule } from "~src/module/app.module";
import { BungieApiService } from "~src/service/bungie-api/bungie.api.service";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";
import { GeneralUser } from "~type/bungie-api/user.types";
import { UserInfoCard } from "~type/bungie-api/user.types";

type BungieNetDestiny2MembershipInfo = {
  membership: UserInfoCard;
  otherMemberships: UserInfoCard[];
};

export class Destiny2MembershipService {
  private readonly bungieApiService: BungieApiService;

  constructor() {
    this.bungieApiService =
      AppModule.getDefaultInstance().resolve<BungieApiService>("BungieApiService");
  }

  async getBungieNetDestiny2Membership(
    bungieNetMembershipId: string
  ): Promise<[Error, null] | [null, BungieNetDestiny2MembershipInfo]> {
    const logger = this.getLogger();

    logger.debug("Fetching Bungie.net Destiny 2 memberships ...");
    const [membershipsErr, memberships] = await this.getBungieNetDestiny2Memberships(
      bungieNetMembershipId
    );
    if (membershipsErr) {
      return [membershipsErr, null];
    }

    logger.debug(
      [
        `Found ${memberships.length} Destiny 2 memberships`,
        `for Bungie.net membership ID ${bungieNetMembershipId}:`,
        memberships
          .map((membership) => `${membership.membershipType}/${membership.membershipId}`)
          .join(", ")
      ].join(" ")
    );

    return [null, { membership: memberships[0], otherMemberships: memberships.slice(1) }];
  }

  async getBungieNetDestiny2Memberships(
    bungieNetMembershipId: string
  ): Promise<[Error, null] | [null, UserInfoCard[]]> {
    const logger = this.getLogger();

    logger.debug(`Fetching Destiny 2 memberships from Bungie.net membership ...`);
    const [bungieNetUserErr, bungieNetUserRes] = await this.bungieApiService.sendApiRequest(
      "GET",
      `/User/GetBungieNetUserById/${bungieNetMembershipId}`,
      null
    );
    if (bungieNetUserErr) {
      return [bungieNetUserErr, null];
    }

    const [bungieNetUserJsonErr, bungieNetUserJson] =
      await this.bungieApiService.extractApiResponse<GeneralUser>(bungieNetUserRes);
    if (bungieNetUserJsonErr) {
      return [bungieNetUserJsonErr, null];
    }
    if (!bungieNetUserJson.Response) {
      return [new Error(`Missing response in Bungie.net user result`), null];
    }

    const uniqueName = bungieNetUserJson.Response.uniqueName.split("#", 2);

    logger.debug(`Searching for Destiny 2 players with (${uniqueName[0]} / ${uniqueName[1]}) ...`);
    const [searchDestinyPlayersErr, searchDestinyPlayersRes] =
      await this.bungieApiService.sendApiRequest(
        "POST",
        `/Destiny2/SearchDestinyPlayerByBungieName/All`,
        { displayName: uniqueName[0], displayNameCode: uniqueName[1] }
      );
    if (searchDestinyPlayersErr) {
      return [searchDestinyPlayersErr, null];
    }

    const [searchDestinyPlayersJsonErr, searchDestinyPlayersJson] =
      await this.bungieApiService.extractApiResponse<UserInfoCard[]>(searchDestinyPlayersRes);
    if (searchDestinyPlayersJsonErr) {
      return [searchDestinyPlayersJsonErr, null];
    }
    if (!searchDestinyPlayersJson.Response) {
      return [
        new Error(
          `Missing response in Destiny 2 players search result: ${JSON.stringify(
            searchDestinyPlayersJson
          )}`
        ),
        null
      ];
    }

    return [
      null,
      searchDestinyPlayersJson.Response.filter((membership) =>
        membership.applicableMembershipTypes.includes(membership.crossSaveOverride)
      )
    ];
  }

  private getLogger(): Logger {
    return AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("Destiny2MembershipService");
  }
}
