import { AppModule } from "~src/module/app.module";
import { BungieApiService } from "~src/service/bungie-api/bungie.api.service";
import { Destiny2ManifestService } from "~src/service/destiny2-manifest/destiny2-manifest.service";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";
import { DestinyComponentType } from "~type/bungie-api/destiny.types";
import { ItemLocation } from "~type/bungie-api/destiny.types";
import { DestinyInventoryBucketDefinition } from "~type/bungie-api/destiny/definitions.types";
import { DestinyItemComponent } from "~type/bungie-api/destiny/entities/items.types";
import { DestinyItemInstanceComponent } from "~type/bungie-api/destiny/entities/items.types";
import { DestinyProfileResponse } from "~type/bungie-api/destiny/responses";
import { DestinyCharacterResponse } from "~type/bungie-api/destiny/responses";
import { Destiny2ManifestInventoryBucketDefinitions } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestLanguage } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestComponent } from "~type/bungie-asset/destiny2.types";

import { GetVaultItemsOptions } from "./destiny2-inventory.types";
import { GetProfileInventoryItemsOptions } from "./destiny2-inventory.types";
import { GetInventoryItemsOptions } from "./destiny2-inventory.types";
import { GetEquipmentItemsOptions } from "./destiny2-inventory.types";

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
    membershipId: string,
    options?: GetVaultItemsOptions
  ): Promise<
    | [Error, null, null]
    | [null, DestinyItemComponent[], Record<string, DestinyItemInstanceComponent>]
  > {
    const logger = this.getLogger();

    logger.debug(`Getting vault buckets ...`);
    const [vaultBucketsErr, vaultBuckets] = await this.getLocationBuckets(ItemLocation.Vault);
    if (vaultBucketsErr) {
      return [vaultBucketsErr, null, null];
    }

    const vaultBucketHashes = vaultBuckets.map((vaultBucket) => vaultBucket.hash);

    logger.debug(`Getting profile inventory items ...`);
    const [profileInventoryItemsErr, profileInventoryItems, profileInventoryItemInstances] =
      await this.getProfileInventoryItems(sessionId, membershipType, membershipId, {
        includeItemInstances: options?.includeItemInstances
      });
    if (profileInventoryItemsErr) {
      return [profileInventoryItemsErr, null, null];
    }

    return [
      null,
      profileInventoryItems.filter((item) => vaultBucketHashes.includes(item.bucketHash)),
      profileInventoryItemInstances
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
    membershipId: string,
    options?: GetProfileInventoryItemsOptions
  ): Promise<
    | [Error, null, null]
    | [null, DestinyItemComponent[], Record<string, DestinyItemInstanceComponent>]
  > {
    const logger = this.getLogger();

    logger.debug(`Fetching all profile inventory items for ${membershipType}/${membershipId} ...`);
    const [profileInventoryErr, profileInventoryRes] =
      await this.bungieApiService.sendSessionApiRequest(
        sessionId,
        "GET",
        `/Destiny2/${membershipType}/Profile/${membershipId}?components=${[
          DestinyComponentType.ProfileInventories,
          ...(options?.includeItemInstances ? [DestinyComponentType.ItemInstances] : [])
        ].join(",")}`,
        null
      );
    if (profileInventoryErr) {
      return [profileInventoryErr, null, null];
    }

    const [profileInventoryJsonErr, profileInventoryJson] =
      await this.bungieApiService.extractApiResponse<DestinyProfileResponse>(profileInventoryRes);
    if (profileInventoryJsonErr) {
      return [profileInventoryJsonErr, null, null];
    }

    return [
      null,
      profileInventoryJson.Response?.profileInventory?.data.items || [],
      profileInventoryJson.Response?.itemComponents?.instances?.data || {}
    ];
  }

  async getInventoryItems(
    sessionId: string,
    membershipType: number,
    membershipId: string,
    characterId: string,
    options?: GetInventoryItemsOptions
  ): Promise<
    | [Error, null, null]
    | [null, DestinyItemComponent[], Record<string, DestinyItemInstanceComponent>]
  > {
    const logger = this.getLogger();

    logger.debug(
      `Fetching all inventory items for ${membershipType}/${membershipId}/${characterId} ...`
    );
    const [characterInventoryErr, characterInventoryRes] =
      await this.bungieApiService.sendSessionApiRequest(
        sessionId,
        "GET",
        `/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}?components=${[
          DestinyComponentType.CharacterInventories,
          ...(options?.includeItemInstances ? [DestinyComponentType.ItemInstances] : [])
        ].join(",")}`,
        null
      );
    if (characterInventoryErr) {
      return [characterInventoryErr, null, null];
    }

    const [characterInventoryJsonErr, characterInventoryJson] =
      await this.bungieApiService.extractApiResponse<DestinyCharacterResponse>(
        characterInventoryRes
      );
    if (characterInventoryJsonErr) {
      return [characterInventoryJsonErr, null, null];
    }

    return [
      null,
      characterInventoryJson.Response?.inventory?.data.items || [],
      characterInventoryJson.Response?.itemComponents?.instances?.data || {}
    ];
  }

  async getEquipmentItems(
    sessionId: string,
    membershipType: number,
    membershipId: string,
    characterId: string,
    options?: GetEquipmentItemsOptions
  ): Promise<
    | [Error, null, null]
    | [null, DestinyItemComponent[], Record<string, DestinyItemInstanceComponent>]
  > {
    const logger = this.getLogger();

    logger.debug(
      `Fetching all equipment items for ${membershipType}/${membershipId}/${characterId} ...`
    );
    const [characterInventoryErr, characterInventoryRes] =
      await this.bungieApiService.sendSessionApiRequest(
        sessionId,
        "GET",
        `/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}?components=${[
          DestinyComponentType.CharacterEquipment,
          ...(options?.includeItemInstances ? [DestinyComponentType.ItemInstances] : [])
        ].join(",")}`,
        null
      );
    if (characterInventoryErr) {
      return [characterInventoryErr, null, null];
    }

    const [characterInventoryJsonErr, characterInventoryJson] =
      await this.bungieApiService.extractApiResponse<DestinyCharacterResponse>(
        characterInventoryRes
      );
    if (characterInventoryJsonErr) {
      return [characterInventoryJsonErr, null, null];
    }

    return [
      null,
      characterInventoryJson.Response?.equipment?.data.items || [],
      characterInventoryJson.Response?.itemComponents?.instances?.data || {}
    ];
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
