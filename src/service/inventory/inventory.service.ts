import { AppModule } from "~src/module/app.module";
import { resolveCharacterEquipmentItemInstances } from "~src/service/destiny2-component-data/character.resolver";
import { resolveCharacterInventoryItemInstances } from "~src/service/destiny2-component-data/character.resolver";
import { Destiny2ComponentDataService } from "~src/service/destiny2-component-data/destiny2-component-data.service";
import { resolveProfileInventoryItemInstances } from "~src/service/destiny2-component-data/profile.resolver";
import { Destiny2ManifestService } from "~src/service/destiny2-manifest/destiny2-manifest.service";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";
import { ItemLocation } from "~type/bungie-api/destiny.types";
import { DestinyInventoryBucketDefinition } from "~type/bungie-api/destiny/definitions.types";
import { DestinyItemComponent } from "~type/bungie-api/destiny/entities/items.types";
import { DestinyItemInstanceComponent } from "~type/bungie-api/destiny/entities/items.types";
import { Destiny2ManifestInventoryBucketDefinitions } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestLanguage } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestComponent } from "~type/bungie-asset/destiny2.types";

export class InventoryService {
  private readonly destiny2ManifestService: Destiny2ManifestService;
  private readonly destiny2ComponentDataService: Destiny2ComponentDataService;

  constructor() {
    this.destiny2ManifestService =
      AppModule.getDefaultInstance().resolve<Destiny2ManifestService>("Destiny2ManifestService");

    this.destiny2ComponentDataService =
      AppModule.getDefaultInstance().resolve<Destiny2ComponentDataService>(
        "Destiny2ComponentDataService"
      );
  }

  async getVaultItems(
    sessionId: string,
    membershipType: number,
    membershipId: string
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
      await this.getProfileInventoryItems(sessionId, membershipType, membershipId);
    if (profileInventoryItemsErr) {
      return [profileInventoryItemsErr, null, null];
    }

    return [
      null,
      profileInventoryItems.filter((item) => vaultBucketHashes.includes(item.bucketHash)),
      profileInventoryItemInstances
    ];
  }

  async getProfileInventoryItems(
    sessionId: string,
    membershipType: number,
    membershipId: string
  ): Promise<
    | [Error, null, null]
    | [null, DestinyItemComponent[], Record<string, DestinyItemInstanceComponent>]
  > {
    const logger = this.getLogger();

    logger.debug(`Fetching all profile inventory items for ${membershipType}/${membershipId} ...`);
    const [profileInventoryItemDataErr, profileInventoryItemData] =
      await this.destiny2ComponentDataService.getProfileComponentsData(
        sessionId,
        membershipType,
        membershipId,
        resolveProfileInventoryItemInstances
      );
    if (profileInventoryItemDataErr) {
      return [profileInventoryItemDataErr, null, null];
    }

    return [null, ...profileInventoryItemData];
  }

  async getInventoryItems(
    sessionId: string,
    membershipType: number,
    membershipId: string,
    characterId: string
  ): Promise<
    | [Error, null, null]
    | [null, DestinyItemComponent[], Record<string, DestinyItemInstanceComponent>]
  > {
    const logger = this.getLogger();

    logger.debug(
      `Fetching all inventory items for ${membershipType}/${membershipId}/${characterId} ...`
    );
    const [inventoryItemDataErr, inventoryItemData] =
      await this.destiny2ComponentDataService.getCharacterComponentsData(
        sessionId,
        membershipType,
        membershipId,
        characterId,
        resolveCharacterInventoryItemInstances
      );
    if (inventoryItemDataErr) {
      return [inventoryItemDataErr, null, null];
    }

    return [null, ...inventoryItemData];
  }

  async getEquipmentItems(
    sessionId: string,
    membershipType: number,
    membershipId: string,
    characterId: string
  ): Promise<
    | [Error, null, null]
    | [null, DestinyItemComponent[], Record<string, DestinyItemInstanceComponent>]
  > {
    const logger = this.getLogger();

    logger.debug(
      `Fetching all equipment items for ${membershipType}/${membershipId}/${characterId} ...`
    );
    const [equipmentItemDataErr, equipmentItemData] =
      await this.destiny2ComponentDataService.getCharacterComponentsData(
        sessionId,
        membershipType,
        membershipId,
        characterId,
        resolveCharacterEquipmentItemInstances
      );
    if (equipmentItemDataErr) {
      return [equipmentItemDataErr, null, null];
    }

    return [null, ...equipmentItemData];
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
      .getLogger("InventoryService");
  }
}
