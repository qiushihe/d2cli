import { AppModule } from "~src/module/app.module";
import { BungieApiService } from "~src/service/bungie-api/bungie.api.service";
import { BungieApiComponentType } from "~src/service/bungie-api/bungie-api.types";
import { BungieApiDestiny2Character } from "~src/service/destiny2-character/destiny2-character.types";
import {
  BungieApiDestiny2InventoryItemLocation,
  BungieApiDestiny2ItemComponent
} from "~src/service/destiny2-item/destiny2-item.types";
import { Destiny2ManifestService } from "~src/service/destiny2-manifest/destiny2-manifest.service";
import { BungieApiDestiny2InventoryBucketDefinitions } from "~src/service/destiny2-manifest/destiny2-manifest.types";
import { BungieApiDestiny2InventoryItemDefinition } from "~src/service/destiny2-manifest/destiny2-manifest.types";
import { BungieApiDestiny2InventoryItemDefinitions } from "~src/service/destiny2-manifest/destiny2-manifest.types";
import { BungieApiDestiny2ManifestLanguage } from "~src/service/destiny2-manifest/destiny2-manifest.types";
import { BungieApiDestiny2ManifestComponent } from "~src/service/destiny2-manifest/destiny2-manifest.types";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";

export class Destiny2InventoryService {
  private readonly bungieApiService: BungieApiService;
  private readonly destiny2ManifestService: Destiny2ManifestService;

  constructor() {
    this.bungieApiService =
      AppModule.getDefaultInstance().resolve<BungieApiService>("BungieApiService");

    this.destiny2ManifestService =
      AppModule.getDefaultInstance().resolve<Destiny2ManifestService>("Destiny2ManifestService");
  }

  async getItemDefinition(
    itemHash: number
  ): Promise<[Error, null] | [null, BungieApiDestiny2InventoryItemDefinition]> {
    const [itemDefinitionErr, itemDefinitions] =
      await this.destiny2ManifestService.getDestiny2ManifestComponent<BungieApiDestiny2InventoryItemDefinitions>(
        BungieApiDestiny2ManifestLanguage.English,
        BungieApiDestiny2ManifestComponent.InventoryItemDefinition
      );
    if (itemDefinitionErr) {
      return [itemDefinitionErr, null];
    }

    const itemDefinition = itemDefinitions[itemHash];
    if (!itemDefinition) {
      return [new Error(`Definition not found for item hash: ${itemHash}`), null];
    }

    return [null, itemDefinition];
  }

  async getPostmasterItems(
    sessionId: string,
    membershipType: number,
    membershipId: string,
    characterId: string
  ): Promise<[Error, null] | [null, BungieApiDestiny2ItemComponent[]]> {
    const logger = this.getLogger();

    const [postmasterBucketHashesErr, postmasterBucketHashes] = await this.getLocationBucketHashes(
      BungieApiDestiny2InventoryItemLocation.Postmaster
    );
    if (postmasterBucketHashesErr) {
      return [postmasterBucketHashesErr, null];
    }

    logger.debug(
      `Fetching postmaster items for ${membershipType}/${membershipId}/${characterId} ...`
    );
    const [characterInventoryErr, characterInventoryRes] =
      await this.bungieApiService.sendSessionApiRequest(
        sessionId,
        "GET",
        `/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}?components=${BungieApiComponentType.CharacterInventories}`,
        null
      );
    if (characterInventoryErr) {
      return [characterInventoryErr, null];
    }

    const [characterInventoryJsonErr, characterInventoryJson] =
      await this.bungieApiService.extractApiResponse<BungieApiDestiny2Character>(
        characterInventoryRes
      );
    if (characterInventoryJsonErr) {
      return [characterInventoryJsonErr, null];
    }

    const postmasterItems = (characterInventoryJson.Response?.inventory?.data.items || []).filter(
      (item) => postmasterBucketHashes.includes(item.bucketHash)
    );

    return [null, postmasterItems];
  }

  async getLocationBucketHashes(
    location: BungieApiDestiny2InventoryItemLocation
  ): Promise<[Error, null] | [null, number[]]> {
    const [bucketDefinitionErr, bucketDefinitions] =
      await this.destiny2ManifestService.getDestiny2ManifestComponent<BungieApiDestiny2InventoryBucketDefinitions>(
        BungieApiDestiny2ManifestLanguage.English,
        BungieApiDestiny2ManifestComponent.InventoryBucketDefinition
      );
    if (bucketDefinitionErr) {
      return [bucketDefinitionErr, null];
    }

    return [
      null,
      Object.values(bucketDefinitions)
        .filter((bucketDefinition) => bucketDefinition.location === location)
        .map((bucketDefinition) => bucketDefinition.hash)
    ];
  }

  private getLogger(): Logger {
    return AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("Destiny2InventoryService");
  }
}
