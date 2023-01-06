import { AppModule } from "~src/module/app.module";
import { BungieApiService } from "~src/service/bungie-api/bungie.api.service";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";
import { DestinyComponentType } from "~type/bungie-api/destiny.types";
import { DestinyVendorComponent } from "~type/bungie-api/destiny/entities/vendors.types";
import { DestinyVendorsResponse } from "~type/bungie-api/destiny/responses";

export class Destiny2VendorService {
  private readonly bungieApiService: BungieApiService;

  constructor() {
    this.bungieApiService =
      AppModule.getDefaultInstance().resolve<BungieApiService>("BungieApiService");
  }

  async getVendors(
    sessionId: string,
    membershipType: number,
    membershipId: string,
    characterId: string
  ): Promise<[Error, null] | [null, DestinyVendorComponent[]]> {
    const logger = this.getLogger();

    logger.debug(`Fetching vendors ...`);
    const [vendorsErr, vendorsRes] = await this.bungieApiService.sendSessionApiRequest(
      sessionId,
      "GET",
      `/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}/Vendors?components=${DestinyComponentType.Vendors}`,
      null
    );
    if (vendorsErr) {
      return [vendorsErr, null];
    }

    const [vendorsJsonErr, vendorsJson] =
      await this.bungieApiService.extractApiResponse<DestinyVendorsResponse>(vendorsRes);
    if (vendorsJsonErr) {
      return [vendorsJsonErr, null];
    }
    if (!vendorsJson.Response) {
      return [new Error("Response missing data"), null];
    }
    if (!vendorsJson.Response.vendors) {
      return [new Error("Response missing vendors data"), null];
    }

    const vendors = Object.values(vendorsJson.Response.vendors.data);

    return [null, vendors];
  }

  private getLogger(): Logger {
    return AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("Destiny2VendorService");
  }
}
