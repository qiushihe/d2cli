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

type ItemComponentsAndInstances = {
  components: DestinyItemComponent[];
  instances: Record<string, DestinyItemInstanceComponent>;
};

export class InventoryService {
  private readonly destiny2ManifestService: Destiny2ManifestService;
  private readonly destiny2ComponentDataService: Destiny2ComponentDataService;

  constructor() {
    this.destiny2ManifestService = AppModule.getDefaultInstance().resolve(Destiny2ManifestService);

    this.destiny2ComponentDataService = AppModule.getDefaultInstance().resolve(
      Destiny2ComponentDataService
    );
  }

  async getVaultItems(
    sessionId: string,
    membershipType: number,
    membershipId: string
  ): Promise<ErrorXOR<ItemComponentsAndInstances>> {
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
      {
        components: profileInventoryItems.components.filter((item) =>
          vaultBucketHashes.includes(item.bucketHash)
        ),
        instances: profileInventoryItems.instances
      }
    ];
  }

  async getProfileInventoryItems(
    sessionId: string,
    membershipType: number,
    membershipId: string
  ): Promise<ErrorXOR<ItemComponentsAndInstances>> {
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
      return [profileInventoryItemDataErr, null];
    }

    return [
      null,
      { components: profileInventoryItemData[0], instances: profileInventoryItemData[1] }
    ];
  }

  async getInventoryItems(
    sessionId: string,
    membershipType: number,
    membershipId: string,
    characterId: string
  ): Promise<ErrorXOR<ItemComponentsAndInstances>> {
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
      return [inventoryItemDataErr, null];
    }

    return [null, { components: inventoryItemData[0], instances: inventoryItemData[1] }];
  }

  async getEquipmentItems(
    sessionId: string,
    membershipType: number,
    membershipId: string,
    characterId: string
  ): Promise<ErrorXOR<ItemComponentsAndInstances>> {
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
      return [equipmentItemDataErr, null];
    }

    return [null, { components: equipmentItemData[0], instances: equipmentItemData[1] }];
  }

  async getLocationBuckets(
    location: ItemLocation
  ): Promise<ErrorXOR<DestinyInventoryBucketDefinition[]>> {
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
    return AppModule.getDefaultInstance().resolve(LogService).getLogger("InventoryService");
  }
}
