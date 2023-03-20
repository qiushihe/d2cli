import { SerializedItem } from "~src/helper/item-serialization.helper";
import { SerializedPlug } from "~src/helper/item-serialization.helper";
import { SerializedItemType } from "~src/helper/item-serialization.helper";
import { SerializedItemBucket } from "~src/helper/item-serialization.helper";
import { CharacterDescription } from "~src/service/character-description/character-description.types";
import { Destiny2InventoryEquipmentService } from "~src/service/destiny2-inventory-equipment/destiny2-inventory-equipment.service";
import { Destiny2InventoryTransferService } from "~src/service/destiny2-inventory-transfer/destiny2-inventory-transfer.service";
import { Destiny2PlugService } from "~src/service/destiny2-plug/destiny2-plug.service";
import { Destiny2ManifestInventoryItemDefinitions } from "~type/bungie-asset/destiny2.types";

export type LoadoutAction = {
  type: "DEPOSIT" | "WITHDRAW" | "EQUIP" | "SOCKET";
  characterName: string;
  characterId: string;
  itemName: string;
  itemHash: number;
  itemInstanceId: string;
  socketIndex: number | null;
  plugItemName: string | null;
  plugItemHash: number | null;
};

export const resolveTransferActions = (
  itemDefinitions: Destiny2ManifestInventoryItemDefinitions,
  characterDescriptions: Record<string, CharacterDescription>,
  characterId: string,
  equipmentItems: SerializedItem[],
  characterItems: { equipped: SerializedItem[]; unequipped: SerializedItem[] },
  otherCharacterItems: Record<string, { equipped: SerializedItem[]; unequipped: SerializedItem[] }>,
  vaultItemsInfo: SerializedItem[]
): [Error, null] | [null, LoadoutAction[]] => {
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
          type: "WITHDRAW",
          characterName: characterDescriptions[characterId].asString,
          characterId: characterId,
          itemName: itemDefinitions[equipment.itemHash]?.displayProperties.name,
          itemHash: equipment.itemHash,
          itemInstanceId: equipment.itemInstanceId,
          socketIndex: null,
          plugItemName: null,
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
            type: "DEPOSIT",
            characterName: characterDescriptions[unequippedOtherCharacterId].asString,
            characterId: unequippedOtherCharacterId,
            itemName: itemDefinitions[equipment.itemHash]?.displayProperties.name,
            itemHash: equipment.itemHash,
            itemInstanceId: equipment.itemInstanceId,
            socketIndex: null,
            plugItemName: null,
            plugItemHash: null
          });
          actions.push({
            type: "WITHDRAW",
            characterName: characterDescriptions[characterId].asString,
            characterId: characterId,
            itemName: itemDefinitions[equipment.itemHash]?.displayProperties.name,
            itemHash: equipment.itemHash,
            itemInstanceId: equipment.itemInstanceId,
            socketIndex: null,
            plugItemName: null,
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
                `Unable to resolve transfer for: ${equipment.itemHash}:${
                  equipment.itemInstanceId
                } (${
                  itemDefinitions[equipment.itemHash]?.displayProperties.name
                }) from character: ${equippedOtherCharacterId}`
              ),
              null
            ];
          } else {
            return [
              new Error(
                `Unable to find: ${equipment.itemHash}:${equipment.itemInstanceId} (${
                  itemDefinitions[equipment.itemHash]?.displayProperties.name
                })`
              ),
              null
            ];
          }
        }
      }
    }
  }

  return [null, actions];
};

// TODO: Do not generate action is the target item is already equipped.
export const resolveDeExoticActions = (
  characterDescriptions: Record<string, CharacterDescription>,
  characterId: string,
  extraEquipmentsItems: SerializedItem[],
  otherCharacterItems: Record<string, { equipped: SerializedItem[]; unequipped: SerializedItem[] }>,
  vaultItems: SerializedItem[],
  itemType: SerializedItemType,
  itemBucket: SerializedItemBucket
): [Error, null] | [null, LoadoutAction[]] => {
  const actions: LoadoutAction[] = [];

  const extraNonExoticItem =
    extraEquipmentsItems.find(
      (item) => item.itemType === itemType && item.itemBucket === itemBucket && !item.isItemExotic
    ) || null;
  if (extraNonExoticItem) {
    actions.push({
      type: "EQUIP",
      characterName: characterDescriptions[characterId].asString,
      characterId: characterId,
      itemName: extraNonExoticItem.itemName,
      itemHash: extraNonExoticItem.itemHash,
      itemInstanceId: extraNonExoticItem.itemInstanceId,
      socketIndex: null,
      plugItemName: null,
      plugItemHash: null
    });
  } else {
    const vaultNonExoticItem =
      vaultItems.find(
        (item) => item.itemType === itemType && item.itemBucket === itemBucket && !item.isItemExotic
      ) || null;
    if (vaultNonExoticItem) {
      actions.push({
        type: "WITHDRAW",
        characterName: characterDescriptions[characterId].asString,
        characterId: characterId,
        itemName: vaultNonExoticItem.itemName,
        itemHash: vaultNonExoticItem.itemHash,
        itemInstanceId: vaultNonExoticItem.itemInstanceId,
        socketIndex: null,
        plugItemName: null,
        plugItemHash: null
      });

      actions.push({
        type: "EQUIP",
        characterName: characterDescriptions[characterId].asString,
        characterId: characterId,
        itemName: vaultNonExoticItem.itemName,
        itemHash: vaultNonExoticItem.itemHash,
        itemInstanceId: vaultNonExoticItem.itemInstanceId,
        socketIndex: null,
        plugItemName: null,
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
              item.itemType === itemType && item.itemBucket === itemBucket && !item.isItemExotic
          ) || null;
        if (otherCharacterUnequippedNonExoticItem) {
          actions.push({
            type: "DEPOSIT",
            characterName: characterDescriptions[otherCharacterId].asString,
            characterId: otherCharacterId,
            itemName: otherCharacterUnequippedNonExoticItem.itemName,
            itemHash: otherCharacterUnequippedNonExoticItem.itemHash,
            itemInstanceId: otherCharacterUnequippedNonExoticItem.itemInstanceId,
            socketIndex: null,
            plugItemName: null,
            plugItemHash: null
          });

          actions.push({
            type: "WITHDRAW",
            characterName: characterDescriptions[characterId].asString,
            characterId: characterId,
            itemName: otherCharacterUnequippedNonExoticItem.itemName,
            itemHash: otherCharacterUnequippedNonExoticItem.itemHash,
            itemInstanceId: otherCharacterUnequippedNonExoticItem.itemInstanceId,
            socketIndex: null,
            plugItemName: null,
            plugItemHash: null
          });

          actions.push({
            type: "EQUIP",
            characterName: characterDescriptions[characterId].asString,
            characterId: characterId,
            itemName: otherCharacterUnequippedNonExoticItem.itemName,
            itemHash: otherCharacterUnequippedNonExoticItem.itemHash,
            itemInstanceId: otherCharacterUnequippedNonExoticItem.itemInstanceId,
            socketIndex: null,
            plugItemName: null,
            plugItemHash: null
          });

          foundFromOtherCharacter = true;
          break;
        } else {
          const otherCharacterEquippedNonExoticItem =
            itemsInfo.equipped.find(
              (item) =>
                item.itemType === itemType && item.itemBucket === itemBucket && !item.isItemExotic
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
  characterDescriptions: Record<string, CharacterDescription>,
  characterId: string,
  equipmentItems: SerializedItem[],
  equippedItems: SerializedItem[]
): LoadoutAction[] => {
  return equipmentItems
    .filter(
      (item) => !equippedItems.find((equipped) => equipped.itemInstanceId === item.itemInstanceId)
    )
    .map((item) => {
      return {
        type: "EQUIP",
        characterName: characterDescriptions[characterId].asString,
        characterId,
        itemName: item.itemName,
        itemHash: item.itemHash,
        itemInstanceId: item.itemInstanceId,
        socketIndex: null,
        plugItemName: null,
        plugItemHash: null
      };
    });
};

// TODO: Only generate action if the plug isn't already in the socket.
export const resolveSocketActions = (
  itemDefinitions: Destiny2ManifestInventoryItemDefinitions,
  characterDescriptions: Record<string, CharacterDescription>,
  characterId: string,
  plugs: SerializedPlug[]
): LoadoutAction[] => {
  return plugs.map((loadoutSocket) => {
    const itemDefinition = itemDefinitions[loadoutSocket.itemHash];
    const plugItemDefinition = itemDefinitions[loadoutSocket.plugItemHash];

    return {
      type: "SOCKET",
      characterName: characterDescriptions[characterId].asString,
      characterId,
      itemName: itemDefinition?.displayProperties.name || "UNKNOWN ITEM",
      itemHash: loadoutSocket.itemHash,
      itemInstanceId: loadoutSocket.itemInstanceId,
      socketIndex: loadoutSocket.socketIndex,
      plugItemName: plugItemDefinition?.displayProperties.name || "UNKNOWN PLUG",
      plugItemHash: loadoutSocket.plugItemHash
    };
  });
};

export const describeLoadoutAction = (loadoutAction: LoadoutAction) => {
  if (loadoutAction.type === "DEPOSIT") {
    return `Move ${loadoutAction.itemName} from ${loadoutAction.characterName} to vault`;
  } else if (loadoutAction.type === "WITHDRAW") {
    return `Move ${loadoutAction.itemName} from vault to ${loadoutAction.characterName}`;
  } else if (loadoutAction.type === "EQUIP") {
    return `Equip ${loadoutAction.itemName}`;
  } else if (loadoutAction.type === "SOCKET") {
    return `Socket ${loadoutAction.plugItemName} into slot #${
      (loadoutAction.socketIndex || 0) + 1
    } of ${loadoutAction.itemName}`;
  } else {
    return "UNKNOWN LOADOUT ACTION";
  }
};

export const applyLoadoutAction = async (
  destiny2InventoryTransferService: Destiny2InventoryTransferService,
  destiny2InventoryEquipmentService: Destiny2InventoryEquipmentService,
  destiny2PlugService: Destiny2PlugService,
  loadoutAction: LoadoutAction,
  sessionId: string,
  membershipType: number
): Promise<Error | null> => {
  if (loadoutAction.type === "DEPOSIT") {
    const transferErr = await destiny2InventoryTransferService.transferToVault(
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
    const transferErr = await destiny2InventoryTransferService.transferFromVault(
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
    const equipErr = await destiny2InventoryEquipmentService.equip(
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
      const socketErr = await destiny2PlugService.insert(
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
