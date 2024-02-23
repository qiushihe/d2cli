import { AppModule } from "~src/module/app.module";
import { BungieApiService } from "~src/service/bungie-api/bungie.api.service";
import { ComponentDataResolver } from "~src/service/destiny2-component-data/resolver.types";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";
import { DestinyComponentType } from "~type/bungie-api/destiny.types";
import { DestinyVendorsResponse } from "~type/bungie-api/destiny/responses";
import { DestinyProfileResponse } from "~type/bungie-api/destiny/responses";
import { DestinyCharacterResponse } from "~type/bungie-api/destiny/responses";
import { DestinyItemResponse } from "~type/bungie-api/destiny/responses";

export class Destiny2ComponentDataService {
  private readonly bungieApiService: BungieApiService;

  constructor() {
    this.bungieApiService = AppModule.getDefaultInstance().resolve(BungieApiService);
  }

  async getVendorComponentsData<TData>(
    sessionId: string,
    membershipType: number,
    membershipId: string,
    characterId: string,
    resolver: ComponentDataResolver<DestinyVendorsResponse, TData>
  ): Promise<ErrorXOR<TData>> {
    return await this.getComponentsData<DestinyVendorsResponse, TData>(
      sessionId,
      `/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}/Vendors`,
      resolver
    );
  }

  async getProfileComponentsData<TData>(
    sessionId: string,
    membershipType: number,
    membershipId: string,
    resolver: ComponentDataResolver<DestinyProfileResponse, TData>
  ): Promise<ErrorXOR<TData>> {
    return await this.getComponentsData<DestinyProfileResponse, TData>(
      sessionId,
      `/Destiny2/${membershipType}/Profile/${membershipId}`,
      resolver
    );
  }

  async getCharacterComponentsData<TData>(
    sessionId: string,
    membershipType: number,
    membershipId: string,
    characterId: string,
    resolver: ComponentDataResolver<DestinyCharacterResponse, TData>
  ): Promise<ErrorXOR<TData>> {
    return await this.getComponentsData<DestinyCharacterResponse, TData>(
      sessionId,
      `/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}`,
      resolver
    );
  }

  async getItemInstanceComponentsData<TData>(
    sessionId: string,
    membershipType: number,
    membershipId: string,
    itemInstanceId: string,
    resolver: ComponentDataResolver<DestinyItemResponse, TData>
  ): Promise<ErrorXOR<TData>> {
    return await this.getComponentsData<DestinyItemResponse, TData>(
      sessionId,
      `/Destiny2/${membershipType}/Profile/${membershipId}/Item/${itemInstanceId}`,
      resolver
    );
  }

  async getComponentsData<TResponse, TData>(
    sessionId: string,
    url: string,
    resolver: ComponentDataResolver<TResponse, TData>
  ): Promise<ErrorXOR<TData>> {
    const logger = this.getLogger();

    logger.debug(`Fetching components (${resolver.components.join(",")}) from ${url} ...`);
    const [resourceResErr, resourceRes] = await this.fetchComponentsData<TResponse>(
      sessionId,
      url,
      resolver.components
    );
    if (resourceResErr) {
      return [resourceResErr, null];
    }

    const [componentDataErr, componentData] = resolver.resolve(resourceRes);
    if (componentDataErr) {
      return [componentDataErr, null];
    }

    return [null, componentData];
  }

  protected async fetchComponentsData<TResponse>(
    sessionId: string,
    resourceUrl: string,
    componentTypes: DestinyComponentType[]
  ): Promise<ErrorXOR<TResponse>> {
    const [resourceErr, resourceRes] = await this.bungieApiService.sendApiRequest<null, TResponse>(
      sessionId,
      "GET",
      `${resourceUrl}?components=${componentTypes.join(",")}`,
      null
    );
    if (resourceErr) {
      return [resourceErr, null];
    }
    if (!resourceRes) {
      return [new Error("Response missing data"), null];
    }

    return [null, resourceRes];
  }

  private getLogger(): Logger {
    return AppModule.getDefaultInstance()
      .resolve(LogService)
      .getLogger("Destiny2ComponentDataService");
  }
}
