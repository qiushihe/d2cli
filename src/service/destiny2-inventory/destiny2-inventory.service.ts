import { AppModule } from "~src/module/app.module";
import { BungieApiService } from "~src/service/bungie-api/bungie.api.service";
import { Destiny2ManifestService } from "~src/service/destiny2-manifest/destiny2-manifest.service";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";
import { DestinyComponentType } from "~type/bungie-api/destiny.types";
import { ItemLocation } from "~type/bungie-api/destiny.types";
import { DestinyInventoryBucketDefinition } from "~type/bungie-api/destiny/definitions.types";
import { DestinyItemComponent } from "~type/bungie-api/destiny/entities/items.types";
import { DestinyCharacterResponse } from "~type/bungie-api/destiny/responses";
import { Destiny2ManifestInventoryBucketDefinitions } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestLanguage } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestComponent } from "~type/bungie-asset/destiny2.types";

import { CharacterInventoryBuckets } from "./destiny2-inventory.types";

const CHARACTER_INVENTORY_BUCKET_HASHES: Record<CharacterInventoryBuckets, number> = {
  [CharacterInventoryBuckets.KineticWeapon]: 1498876634,
  [CharacterInventoryBuckets.EnergyWeapon]: 2465295065,
  [CharacterInventoryBuckets.PowerWeapon]: 953998645,
  [CharacterInventoryBuckets.Ghost]: 4023194814,
  [CharacterInventoryBuckets.Vehicle]: 2025709351,
  [CharacterInventoryBuckets.Ship]: 284967655,
  [CharacterInventoryBuckets.Helmet]: 3448274439,
  [CharacterInventoryBuckets.Gauntlet]: 3551918588,
  [CharacterInventoryBuckets.ChestArmour]: 14239492,
  [CharacterInventoryBuckets.LegArmour]: 20886954,
  [CharacterInventoryBuckets.ClassItem]: 1585787867
};

const groupItemsBySlot = (
  item: DestinyItemComponent[]
): Record<CharacterInventoryBuckets, DestinyItemComponent[]> => {
  return item.reduce(
    (acc, item) => {
      switch (item.bucketHash) {
        case CHARACTER_INVENTORY_BUCKET_HASHES[CharacterInventoryBuckets.KineticWeapon]:
          acc.kineticWeapon.push(item);
          break;
        case CHARACTER_INVENTORY_BUCKET_HASHES[CharacterInventoryBuckets.EnergyWeapon]:
          acc.energyWeapon.push(item);
          break;
        case CHARACTER_INVENTORY_BUCKET_HASHES[CharacterInventoryBuckets.PowerWeapon]:
          acc.powerWeapon.push(item);
          break;
        case CHARACTER_INVENTORY_BUCKET_HASHES[CharacterInventoryBuckets.Ghost]:
          acc.ghost.push(item);
          break;
        case CHARACTER_INVENTORY_BUCKET_HASHES[CharacterInventoryBuckets.Vehicle]:
          acc.vehicle.push(item);
          break;
        case CHARACTER_INVENTORY_BUCKET_HASHES[CharacterInventoryBuckets.Ship]:
          acc.ship.push(item);
          break;
        case CHARACTER_INVENTORY_BUCKET_HASHES[CharacterInventoryBuckets.Helmet]:
          acc.helmet.push(item);
          break;
        case CHARACTER_INVENTORY_BUCKET_HASHES[CharacterInventoryBuckets.Gauntlet]:
          acc.gauntlet.push(item);
          break;
        case CHARACTER_INVENTORY_BUCKET_HASHES[CharacterInventoryBuckets.ChestArmour]:
          acc.chestArmour.push(item);
          break;
        case CHARACTER_INVENTORY_BUCKET_HASHES[CharacterInventoryBuckets.LegArmour]:
          acc.legArmour.push(item);
          break;
        case CHARACTER_INVENTORY_BUCKET_HASHES[CharacterInventoryBuckets.ClassItem]:
          acc.classItem.push(item);
          break;
      }
      return acc;
    },
    {
      [CharacterInventoryBuckets.KineticWeapon]: [],
      [CharacterInventoryBuckets.EnergyWeapon]: [],
      [CharacterInventoryBuckets.PowerWeapon]: [],
      [CharacterInventoryBuckets.Ghost]: [],
      [CharacterInventoryBuckets.Vehicle]: [],
      [CharacterInventoryBuckets.Ship]: [],
      [CharacterInventoryBuckets.Helmet]: [],
      [CharacterInventoryBuckets.Gauntlet]: [],
      [CharacterInventoryBuckets.ChestArmour]: [],
      [CharacterInventoryBuckets.LegArmour]: [],
      [CharacterInventoryBuckets.ClassItem]: []
    } as Record<CharacterInventoryBuckets, DestinyItemComponent[]>
  );
};

export class Destiny2InventoryService {
  private readonly bungieApiService: BungieApiService;
  private readonly destiny2ManifestService: Destiny2ManifestService;

  constructor() {
    this.bungieApiService =
      AppModule.getDefaultInstance().resolve<BungieApiService>("BungieApiService");

    this.destiny2ManifestService =
      AppModule.getDefaultInstance().resolve<Destiny2ManifestService>("Destiny2ManifestService");
  }

  getEmptySlots(): Record<CharacterInventoryBuckets, DestinyItemComponent[]> {
    return groupItemsBySlot([]);
  }

  async getEquipmentItemsBySlot(
    sessionId: string,
    membershipType: number,
    membershipId: string,
    characterId: string
  ): Promise<[Error, null] | [null, Record<CharacterInventoryBuckets, DestinyItemComponent[]>]> {
    const [allItemsErr, allItems] = await this.getEquipmentItems(
      sessionId,
      membershipType,
      membershipId,
      characterId
    );
    if (allItemsErr) {
      return [allItemsErr, null];
    }

    return [null, groupItemsBySlot(allItems)];
  }

  async getInventoryItemsBySlot(
    sessionId: string,
    membershipType: number,
    membershipId: string,
    characterId: string
  ): Promise<[Error, null] | [null, Record<CharacterInventoryBuckets, DestinyItemComponent[]>]> {
    const [allItemsErr, allItems] = await this.getInventoryItems(
      sessionId,
      membershipType,
      membershipId,
      characterId
    );
    if (allItemsErr) {
      return [allItemsErr, null];
    }

    return [null, groupItemsBySlot(allItems)];
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

    const [allItemsErr, allItems] = await this.getInventoryItems(
      sessionId,
      membershipType,
      membershipId,
      characterId
    );
    if (allItemsErr) {
      return [allItemsErr, null];
    }

    return [null, allItems.filter((item) => postmasterBucketHashes.includes(item.bucketHash))];
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
