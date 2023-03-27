import { InventoryBucket } from "~src/helper/inventory-bucket.helper";
import { InventoryBucketHashes } from "~src/helper/inventory-bucket.helper";
import { ArmourBucketHashes } from "~src/helper/inventory-bucket.helper";
import { WeaponBucketHashes } from "~src/helper/inventory-bucket.helper";
import { CharacterDescription } from "~src/service/character-description/character-description.types";
import { Destiny2ActionService } from "~src/service/destiny2-action/destiny2-action.service";
import { PlugService } from "~src/service/plug/plug.service";
import { DestinyInventoryItemDefinition } from "~type/bungie-api/destiny/definitions.types";
import { DestinyItemComponent } from "~type/bungie-api/destiny/entities/items.types";

export type LoadoutItemType = "SUBCLASS" | "WEAPON" | "ARMOUR" | "OTHER";

export type LoadoutItemBucket =
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

export type LoadoutItem = {
  itemType: LoadoutItemType;
  itemBucket: LoadoutItemBucket;
  itemHash: number;
  itemInstanceId: string;
  isItemExotic: boolean;
};

export type LoadoutPlug = {
  itemType: LoadoutItemType;
  itemBucket: LoadoutItemBucket;
  itemHash: number;
  itemInstanceId: string;
  socketIndex: number;
  plugItemHash: number;
};

export type LoadoutAction = {
  skip: boolean;
  type: "DEPOSIT" | "WITHDRAW" | "EQUIP" | "SOCKET";
  characterId: string;
  itemHash: number;
  itemInstanceId: string;
  socketIndex: number | null;
  plugItemHash: number | null;
};

export const EXOTIC_TIER_TYPE_HASH = 2759499571;

export const parseLoadoutItem = (
  itemDefinitions: Record<number, DestinyInventoryItemDefinition>,
  itemHash: number,
  itemInstanceId: string
): [Error, null] | [null, LoadoutItem] => {
  const itemDefinition = itemDefinitions[itemHash];
  const bucketHash = itemDefinition.inventory.bucketTypeHash;

  let itemType: LoadoutItemType;
  if (bucketHash === InventoryBucketHashes[InventoryBucket.Subclass]) {
    itemType = "SUBCLASS";
  } else if (ArmourBucketHashes.includes(bucketHash)) {
    itemType = "ARMOUR";
  } else if (WeaponBucketHashes.includes(bucketHash)) {
    itemType = "WEAPON";
  } else {
    itemType = "OTHER";
  }

  let itemBucket: LoadoutItemBucket;
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
      itemHash: itemHash,
      itemInstanceId: itemInstanceId,
      isItemExotic: itemDefinition.inventory.tierTypeHash === EXOTIC_TIER_TYPE_HASH
    }
  ];
};

// TODO: Can not de-exotic using an armour piece that the current character can not equip.
export const resolveTransferActions = async (
  characterId: string,
  equipmentItems: LoadoutItem[],
  characterItems: { equipped: DestinyItemComponent[]; unequipped: DestinyItemComponent[] },
  otherCharacterItems: Record<
    string,
    { equipped: DestinyItemComponent[]; unequipped: DestinyItemComponent[] }
  >,
  vaultItemsInfo: DestinyItemComponent[]
): Promise<[Error, null] | [null, LoadoutAction[]]> => {
  const actions: LoadoutAction[] = [];

  for (let equipmentIndex = 0; equipmentIndex < equipmentItems.length; equipmentIndex++) {
    const equipment = equipmentItems[equipmentIndex];

    if (
      !characterItems.equipped.find(
        (item) =>
          item.itemHash === equipment.itemHash && item.itemInstanceId === equipment.itemInstanceId
      ) &&
      !characterItems.unequipped.find(
        (item) =>
          item.itemHash === equipment.itemHash && item.itemInstanceId === equipment.itemInstanceId
      )
    ) {
      if (
        vaultItemsInfo.find(
          (item) =>
            item.itemHash === equipment.itemHash && item.itemInstanceId === equipment.itemInstanceId
        )
      ) {
        actions.push({
          skip: false,
          type: "WITHDRAW",
          characterId: characterId,
          itemHash: equipment.itemHash,
          itemInstanceId: equipment.itemInstanceId,
          socketIndex: null,
          plugItemHash: null
        });
      } else {
        const unequippedOtherCharacterId =
          Object.keys(otherCharacterItems).find((characterId) =>
            otherCharacterItems[characterId].unequipped.find(
              (item) =>
                item.itemHash === equipment.itemHash &&
                item.itemInstanceId === equipment.itemInstanceId
            )
          ) || null;
        if (unequippedOtherCharacterId) {
          actions.push({
            skip: false,
            type: "DEPOSIT",
            characterId: unequippedOtherCharacterId,
            itemHash: equipment.itemHash,
            itemInstanceId: equipment.itemInstanceId,
            socketIndex: null,
            plugItemHash: null
          });
          actions.push({
            skip: false,
            type: "WITHDRAW",
            characterId: characterId,
            itemHash: equipment.itemHash,
            itemInstanceId: equipment.itemInstanceId,
            socketIndex: null,
            plugItemHash: null
          });
        } else {
          const equippedOtherCharacterId =
            Object.keys(otherCharacterItems).find((characterId) =>
              otherCharacterItems[characterId].equipped.find(
                (item) =>
                  item.itemHash === equipment.itemHash &&
                  item.itemInstanceId === equipment.itemInstanceId
              )
            ) || null;
          if (equippedOtherCharacterId) {
            // TODO: Need to equip a different item in a way that doesn't conflict with this "other"
            //       character. Then move to vault. Then move to current character.
            return [
              new Error(
                `Unable to resolve transfer for: ${equipment.itemHash}:${equipment.itemInstanceId} from character: ${equippedOtherCharacterId}`
              ),
              null
            ];
          } else {
            return [
              new Error(`Unable to find: ${equipment.itemHash}:${equipment.itemInstanceId}`),
              null
            ];
          }
        }
      }
    }
  }

  return [null, actions];
};

const getItemType = (
  itemDefinitions: Record<number, DestinyInventoryItemDefinition>,
  itemHash: number
): LoadoutItemType => {
  const bucketTypeHash = itemDefinitions[itemHash]?.inventory.bucketTypeHash;
  let itemType: LoadoutItemType;

  if (bucketTypeHash === InventoryBucketHashes[InventoryBucket.Subclass]) {
    itemType = "SUBCLASS";
  } else if (ArmourBucketHashes.includes(bucketTypeHash)) {
    itemType = "ARMOUR";
  } else if (WeaponBucketHashes.includes(bucketTypeHash)) {
    itemType = "WEAPON";
  } else {
    itemType = "OTHER";
  }

  return itemType;
};

const getItemBucket = (
  itemDefinitions: Record<number, DestinyInventoryItemDefinition>,
  itemHash: number
): LoadoutItemBucket => {
  const bucketTypeHash = itemDefinitions[itemHash]?.inventory.bucketTypeHash;
  let itemBucket: LoadoutItemBucket;

  if (bucketTypeHash === InventoryBucketHashes[InventoryBucket.KineticWeapon]) {
    itemBucket = InventoryBucket.KineticWeapon;
  } else if (bucketTypeHash === InventoryBucketHashes[InventoryBucket.EnergyWeapon]) {
    itemBucket = InventoryBucket.EnergyWeapon;
  } else if (bucketTypeHash === InventoryBucketHashes[InventoryBucket.PowerWeapon]) {
    itemBucket = InventoryBucket.PowerWeapon;
  } else if (bucketTypeHash === InventoryBucketHashes[InventoryBucket.Helmet]) {
    itemBucket = InventoryBucket.Helmet;
  } else if (bucketTypeHash === InventoryBucketHashes[InventoryBucket.Gauntlet]) {
    itemBucket = InventoryBucket.Gauntlet;
  } else if (bucketTypeHash === InventoryBucketHashes[InventoryBucket.ChestArmour]) {
    itemBucket = InventoryBucket.ChestArmour;
  } else if (bucketTypeHash === InventoryBucketHashes[InventoryBucket.LegArmour]) {
    itemBucket = InventoryBucket.LegArmour;
  } else if (bucketTypeHash === InventoryBucketHashes[InventoryBucket.ClassItem]) {
    itemBucket = InventoryBucket.ClassItem;
  } else if (bucketTypeHash === InventoryBucketHashes[InventoryBucket.Subclass]) {
    itemBucket = InventoryBucket.Subclass;
  } else {
    itemBucket = "other";
  }

  return itemBucket;
};

const getItemIsExotic = (
  itemDefinitions: Record<number, DestinyInventoryItemDefinition>,
  itemHash: number
): boolean => {
  return itemDefinitions[itemHash]?.inventory.tierTypeHash === EXOTIC_TIER_TYPE_HASH;
};

// TODO: For armour pieces, need to check if they're compatible with the
//       current character.
export const resolveDeExoticActions = (
  itemDefinitions: Record<number, DestinyInventoryItemDefinition>,
  characterId: string,
  extraEquipmentsItems: LoadoutItem[],
  otherCharacterItems: Record<
    string,
    { equipped: DestinyItemComponent[]; unequipped: DestinyItemComponent[] }
  >,
  vaultItems: DestinyItemComponent[],
  exoticItem: LoadoutItem
): [Error, null] | [null, LoadoutAction[]] => {
  const actions: LoadoutAction[] = [];

  const extraNonExoticItem =
    extraEquipmentsItems.find(
      (item) =>
        item.itemType === exoticItem.itemType &&
        item.itemBucket === exoticItem.itemBucket &&
        !item.isItemExotic
    ) || null;
  if (extraNonExoticItem) {
    actions.push({
      skip: false,
      type: "EQUIP",
      characterId: characterId,
      itemHash: extraNonExoticItem.itemHash,
      itemInstanceId: extraNonExoticItem.itemInstanceId,
      socketIndex: null,
      plugItemHash: null
    });
  } else {
    const vaultNonExoticItem =
      vaultItems.find(
        (item) =>
          getItemType(itemDefinitions, item.itemHash) === exoticItem.itemType &&
          getItemBucket(itemDefinitions, item.itemHash) === exoticItem.itemBucket &&
          !getItemIsExotic(itemDefinitions, item.itemHash)
      ) || null;
    if (vaultNonExoticItem) {
      actions.push({
        skip: false,
        type: "WITHDRAW",
        characterId: characterId,
        itemHash: vaultNonExoticItem.itemHash,
        itemInstanceId: vaultNonExoticItem.itemInstanceId,
        socketIndex: null,
        plugItemHash: null
      });

      actions.push({
        skip: false,
        type: "EQUIP",
        characterId: characterId,
        itemHash: vaultNonExoticItem.itemHash,
        itemInstanceId: vaultNonExoticItem.itemInstanceId,
        socketIndex: null,
        plugItemHash: null
      });
    } else {
      let foundFromOtherCharacter = false;
      const otherCharacterIds = Object.keys(otherCharacterItems);

      for (
        let otherCharacterIndex = 0;
        otherCharacterIndex < otherCharacterIds.length;
        otherCharacterIndex++
      ) {
        const otherCharacterId = otherCharacterIds[otherCharacterIndex];
        const itemsInfo = otherCharacterItems[otherCharacterId];

        const otherCharacterUnequippedNonExoticItem =
          itemsInfo.unequipped.find(
            (item) =>
              getItemType(itemDefinitions, item.itemHash) === exoticItem.itemType &&
              getItemBucket(itemDefinitions, item.itemHash) === exoticItem.itemBucket &&
              !getItemIsExotic(itemDefinitions, item.itemHash)
          ) || null;
        if (otherCharacterUnequippedNonExoticItem) {
          actions.push({
            skip: false,
            type: "DEPOSIT",
            characterId: otherCharacterId,
            itemHash: otherCharacterUnequippedNonExoticItem.itemHash,
            itemInstanceId: otherCharacterUnequippedNonExoticItem.itemInstanceId,
            socketIndex: null,
            plugItemHash: null
          });

          actions.push({
            skip: false,
            type: "WITHDRAW",
            characterId: characterId,
            itemHash: otherCharacterUnequippedNonExoticItem.itemHash,
            itemInstanceId: otherCharacterUnequippedNonExoticItem.itemInstanceId,
            socketIndex: null,
            plugItemHash: null
          });

          actions.push({
            skip: false,
            type: "EQUIP",
            characterId: characterId,
            itemHash: otherCharacterUnequippedNonExoticItem.itemHash,
            itemInstanceId: otherCharacterUnequippedNonExoticItem.itemInstanceId,
            socketIndex: null,
            plugItemHash: null
          });

          foundFromOtherCharacter = true;
          break;
        } else {
          const otherCharacterEquippedNonExoticItem =
            itemsInfo.equipped.find(
              (item) =>
                getItemType(itemDefinitions, item.itemHash) === exoticItem.itemType &&
                getItemBucket(itemDefinitions, item.itemHash) === exoticItem.itemBucket &&
                !getItemIsExotic(itemDefinitions, item.itemHash)
            ) || null;
          if (otherCharacterEquippedNonExoticItem) {
            // TODO: Need to equip a different item in a way that doesn't conflict with this
            //       "other" character.
            // For now, do nothing here.
          }
        }
      }

      if (!foundFromOtherCharacter) {
        return [new Error(`Unable to find non-exotic item`), null];
      }
    }
  }

  return [null, actions];
};

export const resolveEquipActions = (
  characterId: string,
  equipmentItems: LoadoutItem[],
  equippedItems: DestinyItemComponent[]
): LoadoutAction[] => {
  return equipmentItems.map((item) => {
    const alreadyEquipped = !!equippedItems.find(
      (equipped) => equipped.itemInstanceId === item.itemInstanceId
    );

    return {
      skip: alreadyEquipped,
      type: "EQUIP",
      characterId,
      itemHash: item.itemHash,
      itemInstanceId: item.itemInstanceId,
      socketIndex: null,
      plugItemHash: null
    };
  });
};

export const resolveSocketActions = (
  characterId: string,
  socketIndicesByItemHash: Record<number, number[]>,
  equippedPlugHashesByItemInstanceId: Record<string, number[]>,
  plugs: LoadoutPlug[]
): LoadoutAction[] => {
  const loadoutActions: LoadoutAction[] = [];

  plugs.forEach((plug) => {
    const socketIndices = socketIndicesByItemHash[plug.itemHash];
    const normalizedSocketIndex = socketIndices.indexOf(plug.socketIndex);

    const equippedPlugHashes = socketIndicesByItemHash[plug.itemHash].map(
      (index) => equippedPlugHashesByItemInstanceId[plug.itemInstanceId][index]
    );

    const equippedPlugHash = equippedPlugHashes[normalizedSocketIndex];

    const alreadyEquipped = plug.plugItemHash === equippedPlugHash;

    loadoutActions.push({
      skip: alreadyEquipped,
      type: "SOCKET",
      characterId,
      itemHash: plug.itemHash,
      itemInstanceId: plug.itemInstanceId,
      socketIndex: plug.socketIndex,
      plugItemHash: plug.plugItemHash
    });
  });

  return loadoutActions;
};

export const describeLoadoutAction = (
  itemDefinitions: Record<number, DestinyInventoryItemDefinition>,
  characterDescriptions: Record<string, CharacterDescription>,
  loadoutAction: LoadoutAction
) => {
  const characterName = characterDescriptions[loadoutAction.characterId].asString;

  const itemName =
    itemDefinitions[loadoutAction.itemHash || -1]?.displayProperties.name || "UNKNOWN ITEM";

  const plugItemName =
    itemDefinitions[loadoutAction.plugItemHash || -1]?.displayProperties.name || "UNKNOWN PLUG";

  if (loadoutAction.type === "DEPOSIT") {
    return `Move ${itemName} from ${characterName} to vault`;
  } else if (loadoutAction.type === "WITHDRAW") {
    return `Move ${itemName} from vault to ${characterName}`;
  } else if (loadoutAction.type === "EQUIP") {
    return `Equip ${itemName}`;
  } else if (loadoutAction.type === "SOCKET") {
    return `Socket ${plugItemName} into slot #${
      (loadoutAction.socketIndex || 0) + 1
    } of ${itemName}`;
  } else {
    return "UNKNOWN LOADOUT ACTION";
  }
};

export const applyLoadoutAction = async (
  destiny2ActionService: Destiny2ActionService,
  plugService: PlugService,
  loadoutAction: LoadoutAction,
  sessionId: string,
  membershipType: number
): Promise<Error | null> => {
  if (loadoutAction.type === "DEPOSIT") {
    const transferErr = await destiny2ActionService.transferItemToVault(
      sessionId,
      membershipType,
      loadoutAction.characterId,
      loadoutAction.itemHash,
      loadoutAction.itemInstanceId
    );
    if (transferErr) {
      return transferErr;
    }
  } else if (loadoutAction.type === "WITHDRAW") {
    const transferErr = await destiny2ActionService.transferItemFromVault(
      sessionId,
      membershipType,
      loadoutAction.characterId,
      loadoutAction.itemHash,
      loadoutAction.itemInstanceId
    );
    if (transferErr) {
      return transferErr;
    }
  } else if (loadoutAction.type === "EQUIP") {
    const equipErr = await destiny2ActionService.equipItem(
      sessionId,
      membershipType,
      loadoutAction.characterId,
      loadoutAction.itemInstanceId
    );
    if (equipErr) {
      return equipErr;
    }
  } else if (loadoutAction.type === "SOCKET") {
    const socketIndex = loadoutAction.socketIndex;
    const plugItemHash = loadoutAction.plugItemHash;

    if (socketIndex == null) {
      return new Error("Missing socket index");
    } else if (!plugItemHash) {
      return new Error("Missing plug item hash");
    } else {
      const socketErr = await plugService.insert(
        sessionId,
        membershipType,
        loadoutAction.characterId,
        loadoutAction.itemInstanceId,
        socketIndex,
        plugItemHash
      );
      if (socketErr) {
        return socketErr;
      }
    }
  }
  return null;
};
