import { AppModule } from "~src/module/app.module";
import { BungieApiService } from "~src/service/bungie-api/bungie.api.service";
import { Destiny2ManifestService } from "~src/service/destiny2-manifest/destiny2-manifest.service";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";
import { DestinyComponentType } from "~type/bungie-api/destiny.types";
import { ItemLocation } from "~type/bungie-api/destiny.types";
import { DestinyInventoryBucketDefinition } from "~type/bungie-api/destiny/definitions.types";
import { DestinyItemComponent } from "~type/bungie-api/destiny/entities/items.types";
import { DestinyProfileResponse } from "~type/bungie-api/destiny/responses";
import { DestinyCharacterResponse } from "~type/bungie-api/destiny/responses";
import { Destiny2ManifestInventoryBucketDefinitions } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestLanguage } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestComponent } from "~type/bungie-asset/destiny2.types";

export class Destiny2InventoryService {
  private readonly bungieApiService: BungieApiService;
  private readonly destiny2ManifestService: Destiny2ManifestService;

  constructor() {
    this.bungieApiService =
      AppModule.getDefaultInstance().resolve<BungieApiService>("BungieApiService");

    this.destiny2ManifestService =
      AppModule.getDefaultInstance().resolve<Destiny2ManifestService>("Destiny2ManifestService");
  }

  async getVaultItems(
    sessionId: string,
    membershipType: number,
    membershipId: string
  ): Promise<[Error, null] | [null, DestinyItemComponent[]]> {
    const logger = this.getLogger();

    logger.debug(`Getting vault buckets ...`);
    const [vaultBucketsErr, vaultBuckets] = await this.getLocationBuckets(ItemLocation.Vault);
    if (vaultBucketsErr) {
      return [vaultBucketsErr, null];
    }

    const vaultBucketHashes = vaultBuckets.map((vaultBucket) => vaultBucket.hash);

    logger.debug(`Getting profile inventory items ...`);
    const [profileInventoryItemsErr, profileInventoryItems] = await this.getProfileInventoryItems(
      sessionId,
      membershipType,
      membershipId
    );
    if (profileInventoryItemsErr) {
      return [profileInventoryItemsErr, null];
    }

    return [
      null,
      profileInventoryItems.filter((item) => vaultBucketHashes.includes(item.bucketHash))
    ];
  }

  async getPostmasterItems(
    sessionId: string,
    membershipType: number,
    membershipId: string,
    characterId: string
  ): Promise<[Error, null] | [null, DestinyItemComponent[]]> {
    const logger = this.getLogger();

    logger.debug(`Getting postmaster buckets ...`);
    const [postmasterBucketsErr, postmasterBuckets] = await this.getLocationBuckets(
      ItemLocation.Postmaster
    );
    if (postmasterBucketsErr) {
      return [postmasterBucketsErr, null];
    }

    const postmasterBucketHashes = postmasterBuckets.map(
      (postmasterBucket) => postmasterBucket.hash
    );

    logger.debug(`Getting inventory items ...`);
    const [inventoryItemsErr, inventoryItems] = await this.getInventoryItems(
      sessionId,
      membershipType,
      membershipId,
      characterId
    );
    if (inventoryItemsErr) {
      return [inventoryItemsErr, null];
    }

    return [
      null,
      inventoryItems.filter((item) => postmasterBucketHashes.includes(item.bucketHash))
    ];
  }

  async pullItemFromPostmaster(
    sessionId: string,
    membershipType: number,
    characterId: string,
    itemHash: number,
    itemInstanceId: string | null
  ): Promise<Error | null> {
    const [pullItemErr, pullItemRes] = await this.bungieApiService.sendSessionApiRequest(
      sessionId,
      "POST",
      "/Destiny2/Actions/Items/PullFromPostmaster",
      {
        itemReferenceHash: itemHash,
        itemId: itemInstanceId,
        characterId,
        membershipType
      }
    );
    if (pullItemErr) {
      return pullItemErr;
    }

    if (pullItemRes.status < 200 || pullItemRes.status > 299) {
      const genericMessage = `Unable to extract error message for response status: ${pullItemRes.status} ${pullItemRes.statusText}`;

      const [extractJsonResErr, jsonRes] = await this.bungieApiService.extractResponseJson(
        pullItemRes
      );
      if (extractJsonResErr) {
        const [extractTextResErr, textRes] = await this.bungieApiService.extractResponseText(
          pullItemRes
        );
        if (extractTextResErr) {
          return new Error(genericMessage);
        } else {
          return new Error(textRes);
        }
      } else {
        return new Error(jsonRes.Message || genericMessage);
      }
    } else {
      return null;
    }
  }

  async getProfileInventoryItems(
    sessionId: string,
    membershipType: number,
    membershipId: string
  ): Promise<[Error, null] | [null, DestinyItemComponent[]]> {
    const logger = this.getLogger();

    logger.debug(`Fetching all vault items for ${membershipType}/${membershipId} ...`);
    const [characterInventoryErr, characterInventoryRes] =
      await this.bungieApiService.sendSessionApiRequest(
        sessionId,
        "GET",
        `/Destiny2/${membershipType}/Profile/${membershipId}?components=${DestinyComponentType.ProfileInventories}`,
        null
      );
    if (characterInventoryErr) {
      return [characterInventoryErr, null];
    }

    const [profileInventoryJsonErr, profileInventoryJson] =
      await this.bungieApiService.extractApiResponse<DestinyProfileResponse>(characterInventoryRes);
    if (profileInventoryJsonErr) {
      return [profileInventoryJsonErr, null];
    }

    return [null, profileInventoryJson.Response?.profileInventory?.data.items || []];
  }

  async getInventoryItems(
    sessionId: string,
    membershipType: number,
    membershipId: string,
    characterId: string
  ): Promise<[Error, null] | [null, DestinyItemComponent[]]> {
    const logger = this.getLogger();

    logger.debug(
      `Fetching all inventory items for ${membershipType}/${membershipId}/${characterId} ...`
    );
    const [characterInventoryErr, characterInventoryRes] =
      await this.bungieApiService.sendSessionApiRequest(
        sessionId,
        "GET",
        `/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}?components=${DestinyComponentType.CharacterInventories}`,
        null
      );
    if (characterInventoryErr) {
      return [characterInventoryErr, null];
    }

    const [characterInventoryJsonErr, characterInventoryJson] =
      await this.bungieApiService.extractApiResponse<DestinyCharacterResponse>(
        characterInventoryRes
      );
    if (characterInventoryJsonErr) {
      return [characterInventoryJsonErr, null];
    }

    return [null, characterInventoryJson.Response?.inventory?.data.items || []];
  }

  async getEquipmentItems(
    sessionId: string,
    membershipType: number,
    membershipId: string,
    characterId: string
  ): Promise<[Error, null] | [null, DestinyItemComponent[]]> {
    const logger = this.getLogger();

    logger.debug(
      `Fetching all equipment items for ${membershipType}/${membershipId}/${characterId} ...`
    );
    const [characterInventoryErr, characterInventoryRes] =
      await this.bungieApiService.sendSessionApiRequest(
        sessionId,
        "GET",
        `/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}?components=${DestinyComponentType.CharacterEquipment}`,
        null
      );
    if (characterInventoryErr) {
      return [characterInventoryErr, null];
    }

    const [characterInventoryJsonErr, characterInventoryJson] =
      await this.bungieApiService.extractApiResponse<DestinyCharacterResponse>(
        characterInventoryRes
      );
    if (characterInventoryJsonErr) {
      return [characterInventoryJsonErr, null];
    }

    return [null, characterInventoryJson.Response?.equipment?.data.items || []];
  }

  async getLocationBuckets(
    location: ItemLocation
  ): Promise<[Error, null] | [null, DestinyInventoryBucketDefinition[]]> {
    const [bucketDefinitionErr, bucketDefinitions] =
      await this.destiny2ManifestService.getManifestComponent<Destiny2ManifestInventoryBucketDefinitions>(
        Destiny2ManifestLanguage.English,
        Destiny2ManifestComponent.InventoryBucketDefinition
      );
    if (bucketDefinitionErr) {
      return [bucketDefinitionErr, null];
    }

    return [
      null,
      Object.values(bucketDefinitions).filter(
        (bucketDefinition) => bucketDefinition.location === location
      )
    ];
  }

  private getLogger(): Logger {
    return AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("Destiny2InventoryService");
  }
}
