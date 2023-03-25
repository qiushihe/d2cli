import { InventoryBucket } from "~src/helper/inventory-bucket.helper";
import { ArmourBucketHashes } from "~src/helper/inventory-bucket.helper";
import { WeaponBucketHashes } from "~src/helper/inventory-bucket.helper";
import { InventoryBucketHashes } from "~src/helper/inventory-bucket.helper";
import { CharacterDescription } from "~src/service/character-description/character-description.types";
import { InventoryService } from "~src/service/inventory/inventory.service";
import { ManifestDefinitionService } from "~src/service/manifest-definition/manifest-definition.service";
import { DestinyInventoryItemDefinition } from "~type/bungie-api/destiny/definitions.types";
import { DestinyItemComponent } from "~type/bungie-api/destiny/entities/items.types";

export type SerializedItemType = "SUBCLASS" | "WEAPON" | "ARMOUR" | "OTHER";

export type SerializedItemBucket =
  | InventoryBucket.KineticWeapon
  | InventoryBucket.EnergyWeapon
  | InventoryBucket.PowerWeapon
  | InventoryBucket.Helmet
  | InventoryBucket.Gauntlet
  | InventoryBucket.ChestArmour
  | InventoryBucket.LegArmour
  | InventoryBucket.ClassItem
  | InventoryBucket.Subclass
  | "other";

export type SerializedItem = {
  itemType: SerializedItemType;
  itemBucket: SerializedItemBucket;
  itemName: string;
  itemHash: number;
  itemInstanceId: string;
  isItemExotic: boolean;
};

export type SerializedPlug = {
  label: string;
  itemType: SerializedItemType;
  itemBucket: SerializedItemBucket;
  itemName: string;
  itemHash: number;
  itemInstanceId: string;
  socketIndex: number;
  plugItemName: string;
  plugItemHash: number;
};

const EXOTIC_TIER_TYPE_HASH = 2759499571;

export const serializeItem = (
  itemDefinition: DestinyInventoryItemDefinition,
  itemHash: number,
  itemInstanceId: string
): [Error, null] | [null, SerializedItem] => {
  const bucketHash = itemDefinition.inventory.bucketTypeHash;

  let itemType: SerializedItemType;
  if (bucketHash === InventoryBucketHashes[InventoryBucket.Subclass]) {
    itemType = "SUBCLASS";
  } else if (ArmourBucketHashes.includes(bucketHash)) {
    itemType = "ARMOUR";
  } else if (WeaponBucketHashes.includes(bucketHash)) {
    itemType = "WEAPON";
  } else {
    itemType = "OTHER";
  }

  let itemBucket: SerializedItemBucket;
  if (bucketHash === InventoryBucketHashes[InventoryBucket.KineticWeapon]) {
    itemBucket = InventoryBucket.KineticWeapon;
  } else if (bucketHash === InventoryBucketHashes[InventoryBucket.EnergyWeapon]) {
    itemBucket = InventoryBucket.EnergyWeapon;
  } else if (bucketHash === InventoryBucketHashes[InventoryBucket.PowerWeapon]) {
    itemBucket = InventoryBucket.PowerWeapon;
  } else if (bucketHash === InventoryBucketHashes[InventoryBucket.Helmet]) {
    itemBucket = InventoryBucket.Helmet;
  } else if (bucketHash === InventoryBucketHashes[InventoryBucket.Gauntlet]) {
    itemBucket = InventoryBucket.Gauntlet;
  } else if (bucketHash === InventoryBucketHashes[InventoryBucket.ChestArmour]) {
    itemBucket = InventoryBucket.ChestArmour;
  } else if (bucketHash === InventoryBucketHashes[InventoryBucket.LegArmour]) {
    itemBucket = InventoryBucket.LegArmour;
  } else if (bucketHash === InventoryBucketHashes[InventoryBucket.ClassItem]) {
    itemBucket = InventoryBucket.ClassItem;
  } else if (bucketHash === InventoryBucketHashes[InventoryBucket.Subclass]) {
    itemBucket = InventoryBucket.Subclass;
  } else {
    itemBucket = "other";
  }

  return [
    null,
    {
      itemType: itemType,
      itemBucket: itemBucket,
      itemName: itemDefinition.displayProperties.name,
      itemHash: itemHash,
      itemInstanceId: itemInstanceId,
      isItemExotic: itemDefinition.inventory.tierTypeHash === EXOTIC_TIER_TYPE_HASH
    }
  ];
};

export const serializeItems = async (
  manifestDefinitionService: ManifestDefinitionService,
  items: DestinyItemComponent[]
): Promise<[Error, null] | [null, SerializedItem[]]> => {
  const serializedItems: SerializedItem[] = [];

  for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
    const item = items[itemIndex];

    const [itemDefinitionErr, itemDefinition] = await manifestDefinitionService.getItemDefinition(
      item.itemHash
    );
    if (itemDefinitionErr) {
      return [new Error(`Unable to fetch item definition for: ${item.itemHash}`), null];
    }
    if (!itemDefinition) {
      return [new Error(`Unable to find item definition for: ${item.itemHash}`), null];
    }

    const [serializeItemErr, serializedItem] = serializeItem(
      itemDefinition,
      item.itemHash,
      item.itemInstanceId
    );
    if (serializeItemErr) {
      return [
        new Error(`Unable to get item equipment info for: ${serializeItemErr.message}`),
        null
      ];
    }

    serializedItems.push(serializedItem);
  }

  return [null, serializedItems];
};

export const serializeCharacterItems = async (
  manifestDefinitionService: ManifestDefinitionService,
  inventoryService: InventoryService,
  sessionId: string,
  membershipType: number,
  membershipId: string,
  characterId: string
): Promise<[Error, null, null] | [null, SerializedItem[], SerializedItem[]]> => {
  const [equipmentItemsErr, equipmentItems] = await inventoryService.getEquipmentItems(
    sessionId,
    membershipType,
    membershipId,
    characterId
  );
  if (equipmentItemsErr) {
    return [equipmentItemsErr, null, null];
  }

  const [inventoryItemsErr, inventoryItems] = await inventoryService.getInventoryItems(
    sessionId,
    membershipType,
    membershipId,
    characterId
  );
  if (inventoryItemsErr) {
    return [inventoryItemsErr, null, null];
  }

  const [serializeEquippedItemsErr, serializedEquippedItems] = await serializeItems(
    manifestDefinitionService,
    equipmentItems
  );
  if (serializeEquippedItemsErr) {
    return [serializeEquippedItemsErr, null, null];
  }

  const [serializeUnequippedItemsErr, serializedUnequippedItems] = await serializeItems(
    manifestDefinitionService,
    inventoryItems
  );
  if (serializeUnequippedItemsErr) {
    return [serializeUnequippedItemsErr, null, null];
  }

  return [null, serializedEquippedItems, serializedUnequippedItems];
};

export const serializeAllItems = async (
  manifestDefinitionService: ManifestDefinitionService,
  inventoryService: InventoryService,
  characterDescriptions: Record<string, CharacterDescription>,
  sessionId: string,
  membershipType: number,
  membershipId: string,
  characterId: string
): Promise<
  | [Error, null]
  | [
      null,
      {
        currentCharacter: {
          equipped: SerializedItem[];
          unequipped: SerializedItem[];
        };
        otherCharacter: {
          [key: string]: {
            equipped: SerializedItem[];
            unequipped: SerializedItem[];
          };
        };
        vault: SerializedItem[];
      }
    ]
> => {
  const [serializeOwnItemsErr, serializedOwnEquippedItems, serializedOwnUnequippedItems] =
    await serializeCharacterItems(
      manifestDefinitionService,
      inventoryService,
      sessionId,
      membershipType,
      membershipId,
      characterId
    );
  if (serializeOwnItemsErr) {
    return [serializeOwnItemsErr, null];
  }

  const otherCharacterItemsInfo: Record<
    string,
    { equipped: SerializedItem[]; unequipped: SerializedItem[] }
  > = {};

  const otherCharacterIds = Object.keys(characterDescriptions).filter((id) => id !== characterId);

  for (
    let otherCharacterIndex = 0;
    otherCharacterIndex < otherCharacterIds.length;
    otherCharacterIndex++
  ) {
    const otherCharacterId = otherCharacterIds[otherCharacterIndex];

    const [
      serializeOthersItemsErr,
      serializedOthersEquippedItems,
      serializedOthersUnequippedItems
    ] = await serializeCharacterItems(
      manifestDefinitionService,
      inventoryService,
      sessionId,
      membershipType,
      membershipId,
      otherCharacterId
    );
    if (serializeOthersItemsErr) {
      return [serializeOthersItemsErr, null];
    }

    otherCharacterItemsInfo[otherCharacterId] = {
      equipped: serializedOthersEquippedItems,
      unequipped: serializedOthersUnequippedItems
    };
  }

  const [vaultItemsErr, vaultItems] = await inventoryService.getVaultItems(
    sessionId,
    membershipType,
    membershipId
  );
  if (vaultItemsErr) {
    return [vaultItemsErr, null];
  }

  const [serializeVaultItemsErr, serializedVaultItems] = await serializeItems(
    manifestDefinitionService,
    vaultItems
  );
  if (serializeVaultItemsErr) {
    return [serializeVaultItemsErr, null];
  }

  return [
    null,
    {
      currentCharacter: {
        equipped: serializedOwnEquippedItems,
        unequipped: serializedOwnUnequippedItems
      },
      otherCharacter: otherCharacterItemsInfo,
      vault: serializedVaultItems
    }
  ];
};
