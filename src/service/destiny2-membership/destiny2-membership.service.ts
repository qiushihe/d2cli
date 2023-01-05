import { AppModule } from "~src/module/app.module";
import { BungieApiService } from "~src/service/bungie-api/bungie.api.service";
import { CacheService } from "~src/service/cache/cache.service";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";
import { GeneralUser } from "~type/bungie-api/user.types";
import { UserInfoCard } from "~type/bungie-api/user.types";

type MembershipsMapping = Record<string, UserInfoCard[] | null>;

type BungieNetDestiny2MembershipInfo = {
  membership: UserInfoCard;
  otherMemberships: UserInfoCard[];
};

// Membership cache expires in 90 days
const CACHE_EXPIRY = 1000 * 60 * 60 * 24 * 90;

export class Destiny2MembershipService {
  private readonly bungieApiService: BungieApiService;
  private readonly cacheService: CacheService;

  constructor() {
    this.bungieApiService =
      AppModule.getDefaultInstance().resolve<BungieApiService>("BungieApiService");
    this.cacheService = AppModule.getDefaultInstance().resolve<CacheService>("CacheService");
  }

  async getBungieNetDestiny2Membership(
    bungieNetMembershipId: string
  ): Promise<[Error, null] | [null, BungieNetDestiny2MembershipInfo]> {
    const logger = this.getLogger();
    const cacheNamespace = `destiny2-membership`;
    const cacheKey = "bungie-net-destiny2-membership-mapping";

    let membershipMapping: Record<string, UserInfoCard[] | null>;

    const [readCacheErr, cachedMapping] = await this.cacheService.get<MembershipsMapping>(
      cacheNamespace,
      cacheKey
    );
    if (readCacheErr) {
      return [readCacheErr, null];
    }

    if (cachedMapping) {
      logger.debug(`Cache hit for Bungie.net -> Destiny 2 membership mapping`);
      membershipMapping = cachedMapping;
    } else {
      logger.debug(`Cache miss for Bungie.net -> Destiny 2 membership mapping`);
      membershipMapping = {};
    }

    let memberships: UserInfoCard[] | null = membershipMapping[bungieNetMembershipId];
    if (memberships) {
      logger.debug(`Cache hit for Destiny 2 membership in cached mapping`);
    } else {
      logger.debug(`Cache miss for Destiny 2 membership in cached mapping`);

      const [membershipsErr, foundMemberships] = await this.getBungieNetDestiny2Memberships(
        bungieNetMembershipId
      );
      if (membershipsErr) {
        return [membershipsErr, null];
      }

      logger.debug(
        [
          `Found ${foundMemberships.length} Destiny 2 memberships`,
          `for Bungie.net membership ID ${bungieNetMembershipId}:`,
          foundMemberships
            .map((membership) => `${membership.membershipType}/${membership.membershipId}`)
            .join(", ")
        ].join(" ")
      );

      memberships = foundMemberships;
    }

    membershipMapping[bungieNetMembershipId] = memberships;

    const writeCacheErr = await this.cacheService.set<MembershipsMapping>(
      cacheNamespace,
      cacheKey,
      membershipMapping,
      CACHE_EXPIRY
    );
    if (writeCacheErr) {
      return [writeCacheErr, null];
    }

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
