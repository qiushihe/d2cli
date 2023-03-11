import { AppModule } from "~src/module/app.module";
import { BungieApiService } from "~src/service/bungie-api/bungie.api.service";
import { Destiny2MembershipService } from "~src/service/destiny2-membership/destiny2-membership.service";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";
import { SessionService } from "~src/service/session/session.service";
import { DestinyComponentType } from "~type/bungie-api/destiny.types";
import { DestinyItemInstanceComponent } from "~type/bungie-api/destiny/entities/items.types";
import { DestinyItemResponse } from "~type/bungie-api/destiny/responses";

export class Destiny2ItemService {
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

  async getItemInstance(
    sessionId: string,
    membershipType: number,
    membershipId: string,
    itemInstanceId: string
  ): Promise<[Error, null] | [null, DestinyItemInstanceComponent]> {
    const logger = this.getLogger();

    logger.debug(`Fetching item instance ...`);
    const [itemErr, itemRes] = await this.bungieApiService.sendSessionApiRequest(
      sessionId,
      "GET",
      `/Destiny2/${membershipType}/Profile/${membershipId}/Item/${itemInstanceId}?components=${DestinyComponentType.ItemInstances}`,
      null
    );
    if (itemErr) {
      return [itemErr, null];
    }

    const [itemJsonErr, itemJson] =
      await this.bungieApiService.extractApiResponse<DestinyItemResponse>(itemRes);
    if (itemJsonErr) {
      return [itemJsonErr, null];
    }
    if (!itemJson.Response) {
      return [new Error("Response missing data"), null];
    }
    if (!itemJson.Response.instance) {
      return [new Error("Response missing instance data"), null];
    }

    return [null, itemJson.Response.instance.data];
  }

  private getLogger(): Logger {
    return AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("Destiny2ItemService");
  }
}
