import {
  ArmourBucketHashes,
  InventoryBucket,
  InventoryBucketHashes,
  WeaponBucketHashes
} from "~src/enum/inventory.enum";
import { SUBCLASS_SOCKET_NAMES } from "~src/enum/loadout.enum";
import { EXOTIC_TIER_TYPE_HASH } from "~src/enum/tier.enum";
import { AppModule } from "~src/module/app.module";
import { CharacterDescriptionService } from "~src/service/character-description/character-description.service";
import { CharacterDescription } from "~src/service/character-description/character-description.types";
import { Destiny2ActionService } from "~src/service/destiny2-action/destiny2-action.service";
import { Destiny2ComponentDataService } from "~src/service/destiny2-component-data/destiny2-component-data.service";
import { resolveProfileCharacterItemsAndVaultItemsAndItemPlugHashes } from "~src/service/destiny2-component-data/profile.resolver";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";
import { ManifestDefinitionService } from "~src/service/manifest-definition/manifest-definition.service";
import { PlugService } from "~src/service/plug/plug.service";
import { SocketName } from "~src/service/plug/plug.service.types";
import { DestinyInventoryItemDefinition } from "~type/bungie-api/destiny/definitions.types";
import { DestinyItemComponent } from "~type/bungie-api/destiny/entities/items.types";

import { LoadoutItem } from "./loadout-apply.types";
import { LoadoutItemBucket } from "./loadout-apply.types";
import { LoadoutItemType } from "./loadout-apply.types";
import { LoadoutPlug } from "./loadout-apply.types";
import { LoadoutAction } from "./loadout-apply.types";

export class LoadoutApplyService {
  private readonly destiny2ComponentDataService: Destiny2ComponentDataService;
  private readonly destiny2ActionService: Destiny2ActionService;
  private readonly manifestDefinitionService: ManifestDefinitionService;
  private readonly characterDescriptionService: CharacterDescriptionService;
  private readonly plugService: PlugService;

  constructor() {
    this.destiny2ComponentDataService = AppModule.getDefaultInstance().resolve(
      Destiny2ComponentDataService
    );

    this.destiny2ActionService = AppModule.getDefaultInstance().resolve(Destiny2ActionService);

    this.manifestDefinitionService =
      AppModule.getDefaultInstance().resolve(ManifestDefinitionService);

    this.characterDescriptionService = AppModule.getDefaultInstance().resolve(
      CharacterDescriptionService
    );

    this.plugService = AppModule.getDefaultInstance().resolve(PlugService);
  }

  async parseLoadout(
    sessionId: string,
    membershipType: number,
    membershipId: string,
    characterId: string,
    loadoutContent: string
  ): Promise<[Error, null] | [null, LoadoutAction[]]> {
    const logger = this.getLogger();

    logger.debug("Parsing loadout lines ...");

    const loadoutLines = `${loadoutContent}`
      .trim()
      .split("\n")
      .map((line) => `${line}`.trim())
      .filter((line) => line.length > 0);

    const loadoutDataLines: (
      | { type: "LOADOUT_NAME"; loadoutName: string }
      | { type: "LOADOUT_EQUIP"; itemHash: number; itemInstanceId: string }
      | { type: "LOADOUT_EXTRA"; itemHash: number; itemInstanceId: string }
      | {
          type: "LOADOUT_SOCKET";
          itemHash: number;
          itemInstanceId: string;
          socketIndex: number;
          plugItemHash: number;
        }
    )[] = [];
    for (let lineIndex = 0; lineIndex < loadoutLines.length; lineIndex++) {
      const line = loadoutLines[lineIndex];
      const metaLineMatch = line.match(/^LOADOUT\s*\/\/(.*)$/);
      if (metaLineMatch) {
        loadoutDataLines.push({ type: "LOADOUT_NAME", loadoutName: `${metaLineMatch[1]}`.trim() });
      } else {
        const dataLineMatch = line.match(/^([^/]+)\s*\/\/([^/]*)\s*\/\/(.*)$/);
        if (dataLineMatch) {
          const dataType = `${dataLineMatch[1]}`.trim();
          const dataValue = `${dataLineMatch[2]}`.trim();

          if (dataType === "EQUIP") {
            const dataParts = dataValue.split(":", 2);
            const itemHash = parseInt(`${dataParts[0]}`.trim(), 10);
            const itemInstanceId = `${dataParts[1]}`.trim().replace(/\D/gi, "");

            loadoutDataLines.push({ type: "LOADOUT_EQUIP", itemHash, itemInstanceId });
          } else if (dataType === "EXTRA") {
            const dataParts = dataValue.split(":", 2);
            const itemHash = parseInt(`${dataParts[0]}`.trim(), 10);
            const itemInstanceId = `${dataParts[1]}`.trim().replace(/\D/gi, "");

            loadoutDataLines.push({ type: "LOADOUT_EXTRA", itemHash, itemInstanceId });
          } else if (dataType === "SOCKET") {
            const dataParts = dataValue.split("::", 3);
            const itemParts = `${dataParts[0]}`.trim().split(":", 2);
            const indexParts = `${dataParts[1]}`.trim().split(":", 2);
            const plugParts = `${dataParts[2]}`.trim().split(":", 2);
            const itemHash = parseInt(`${itemParts[0]}`.trim(), 10);
            const itemInstanceId = `${itemParts[1]}`.trim().replace(/\D/gi, "");
            const socketIndex = parseInt(`${indexParts[1]}`.trim(), 10);
            const plugItemHash = parseInt(`${plugParts[1]}`.trim(), 10);

            loadoutDataLines.push({
              type: "LOADOUT_SOCKET",
              itemHash,
              itemInstanceId,
              socketIndex,
              plugItemHash
            });
          }
        }
      }
    }

    const loadoutPlugItemHashes: number[] = [];
    for (let lineIndex = 0; lineIndex < loadoutLines.length; lineIndex++) {
      const line = loadoutDataLines[lineIndex];
      if (line.type === "LOADOUT_SOCKET") {
        loadoutPlugItemHashes.push(line.plugItemHash);
      }
    }

    logger.debug("Indexing character descriptions ...");
    const [characterDescriptionsErr, characterDescriptions] =
      await this.characterDescriptionService.getDescriptions(sessionId);
    if (characterDescriptionsErr) {
      return [characterDescriptionsErr, null];
    }

    logger.debug("Indexing all items ...");
    const [allItemsErr, allItems] =
      await this.destiny2ComponentDataService.getProfileComponentsData(
        sessionId,
        membershipType,
        membershipId,
        resolveProfileCharacterItemsAndVaultItemsAndItemPlugHashes
      );
    if (allItemsErr) {
      return [allItemsErr, null];
    }

    const allItemHashes = [
      ...Object.values(allItems.charactersItems)
        .map(({ equipped, unequipped }) => [...equipped, ...unequipped])
        .flat()
        .map((item) => item.itemHash),
      ...allItems.vaultItems.map((item) => item.itemHash),
      ...loadoutPlugItemHashes
    ];

    logger.debug("Indexing all item definitions ...");
    const allItemDefinitions: Record<number, DestinyInventoryItemDefinition> = {};
    for (let itemHashIndex = 0; itemHashIndex < allItemHashes.length; itemHashIndex++) {
      const itemHash = allItemHashes[itemHashIndex];

      const [itemDefinitionErr, itemDefinition] =
        await this.manifestDefinitionService.getItemDefinition(itemHash);
      if (itemDefinitionErr) {
        return [itemDefinitionErr, null];
      }
      if (!itemDefinition) {
        return [new Error(`Unable to find item definition for: ${itemHash}`), null];
      }

      allItemDefinitions[itemHash] = itemDefinition;
    }

    const characterItems = allItems.charactersItems[characterId];

    const otherCharactersItems = Object.keys(allItems.charactersItems)
      .filter((id) => id !== characterId)
      .reduce(
        (acc, characterId) => ({
          ...acc,
          [characterId]: allItems.charactersItems[characterId]
        }),
        {} as Record<
          string,
          { equipped: DestinyItemComponent[]; unequipped: DestinyItemComponent[] }
        >
      );

    const vaultItems = allItems.vaultItems;

    logger.debug("Extracting loadout items ...");

    let loadoutName = "";
    const loadoutEquipments: LoadoutItem[] = [];
    const loadoutExtraEquipments: LoadoutItem[] = [];
    const loadoutPlugs: LoadoutPlug[] = [];

    for (let lineIndex = 0; lineIndex < loadoutLines.length; lineIndex++) {
      const line = loadoutDataLines[lineIndex];

      if (line.type === "LOADOUT_NAME") {
        loadoutName = line.loadoutName;
      } else if (line.type === "LOADOUT_EQUIP") {
        const [loadoutEquipmentErr, loadoutEquipment] = this.getLoadoutItem(
          allItemDefinitions,
          line.itemHash,
          line.itemInstanceId
        );
        if (loadoutEquipmentErr) {
          return [loadoutEquipmentErr, null];
        }

        loadoutEquipments.push(loadoutEquipment);
      } else if (line.type === "LOADOUT_EXTRA") {
        const [loadoutExtraEquipmentErr, loadoutExtraEquipment] = this.getLoadoutItem(
          allItemDefinitions,
          line.itemHash,
          line.itemInstanceId
        );
        if (loadoutExtraEquipmentErr) {
          return [loadoutExtraEquipmentErr, null];
        }

        loadoutExtraEquipments.push(loadoutExtraEquipment);
      } else if (line.type === "LOADOUT_SOCKET") {
        const [loadoutPlugErr, loadoutPlug] = this.getLoadoutItem(
          allItemDefinitions,
          line.itemHash,
          line.itemInstanceId
        );
        if (loadoutPlugErr) {
          return [loadoutPlugErr, null];
        }

        loadoutPlugs.push({
          itemType: loadoutPlug.itemType,
          itemBucket: loadoutPlug.itemBucket,
          itemHash: line.itemHash,
          itemInstanceId: line.itemInstanceId,
          socketIndex: line.socketIndex,
          plugItemHash: line.plugItemHash
        });
      }
    }

    logger.debug(`Loadout name: ${loadoutName}`);

    const loadoutActions: LoadoutAction[] = [];

    logger.debug("Resolving transfer actions ...");
    const [equipmentTransferActions2Err, equipmentTransferActions2] =
      await this.resolveTransferActions(
        allItemDefinitions,
        characterDescriptions,
        characterId,
        loadoutEquipments,
        characterItems,
        otherCharactersItems,
        vaultItems
      );
    if (equipmentTransferActions2Err) {
      return [equipmentTransferActions2Err, null];
    }
    equipmentTransferActions2.forEach((action) => loadoutActions.push(action));

    logger.debug("Resolving extra transfer actions ...");
    const [extraEquipmentTransferActions2Err, extraEquipmentTransferActions2] =
      await this.resolveTransferActions(
        allItemDefinitions,
        characterDescriptions,
        characterId,
        loadoutExtraEquipments,
        characterItems,
        otherCharactersItems,
        vaultItems
      );
    if (extraEquipmentTransferActions2Err) {
      return [extraEquipmentTransferActions2Err, null];
    }
    extraEquipmentTransferActions2.forEach((action) => loadoutActions.push(action));

    const exoticWeapon =
      loadoutEquipments.find((item) => item.itemType === "WEAPON" && item.isItemExotic) || null;
    let reEquipExoticWeapon = false;
    if (exoticWeapon) {
      const alreadyEquipped = !!characterItems.equipped.find(
        (equipped) => equipped.itemInstanceId === exoticWeapon.itemInstanceId
      );

      const alreadyUnEquipped = !!characterItems.unequipped.find(
        (equipped) => equipped.itemInstanceId === exoticWeapon.itemInstanceId
      );

      if (!alreadyEquipped) {
        if (!alreadyUnEquipped) {
          logger.debug("Resolving de-exotic weapon actions ...");
          const [deExoticActionsErr, deExoticActions2] = this.resolveDeExoticActions(
            allItemDefinitions,
            characterDescriptions,
            characterId,
            loadoutExtraEquipments,
            otherCharactersItems,
            vaultItems,
            exoticWeapon
          );
          if (deExoticActionsErr) {
            return [deExoticActionsErr, null];
          }
          deExoticActions2.forEach((action) => loadoutActions.push(action));
        }
        reEquipExoticWeapon = true;
      }
    }

    const exoticArmour =
      loadoutEquipments.find((item) => item.itemType === "ARMOUR" && item.isItemExotic) || null;
    let reEquipExoticArmour = false;
    if (exoticArmour) {
      const alreadyEquipped = !!characterItems.equipped.find(
        (equipped) => equipped.itemInstanceId === exoticArmour.itemInstanceId
      );

      const alreadyUnEquipped = !!characterItems.unequipped.find(
        (equipped) => equipped.itemInstanceId === exoticArmour.itemInstanceId
      );

      if (!alreadyEquipped) {
        if (!alreadyUnEquipped) {
          logger.debug("Resolving de-exotic armour actions ...");
          const [deExoticActionsErr, deExoticActions2] = this.resolveDeExoticActions(
            allItemDefinitions,
            characterDescriptions,
            characterId,
            loadoutExtraEquipments,
            // It's not possible to de-exotic using other classes' armour
            // pieces, so we just pass in an empty collection here, so we'll
            // only use items in the vault.
            // We _can_ use other characters' inventory for de-exotic armour
            // after the `resolveDeExoticActions` function is updated to check
            // for armours' compatibility with the current character.
            {},
            vaultItems,
            exoticArmour
          );
          if (deExoticActionsErr) {
            return [deExoticActionsErr, null];
          }
          deExoticActions2.forEach((action) => loadoutActions.push(action));
        }
        reEquipExoticArmour = true;
      }
    }

    logger.debug("Resolving equip actions ...");
    const equipActions2 = this.resolveEquipActions(
      allItemDefinitions,
      characterDescriptions,
      characterId,
      loadoutEquipments.filter((item) => !item.isItemExotic),
      characterItems.equipped
    );
    equipActions2.forEach((loadoutAction) => loadoutActions.push(loadoutAction));

    if (exoticWeapon && reEquipExoticWeapon) {
      loadoutActions.push({
        skip: false,
        type: "EQUIP",
        characterId,
        characterName: characterDescriptions[characterId]?.asString || "UNKNOWN CHARACTER",
        itemHash: exoticWeapon.itemHash,
        itemName:
          allItemDefinitions[exoticWeapon.itemHash]?.displayProperties.name ||
          "UNKNOWN EXOTIC WEAPON",
        itemInstanceId: exoticWeapon.itemInstanceId,
        socketIndex: null,
        plugItemHash: null,
        plugItemName: null
      });
    }

    if (exoticArmour && reEquipExoticArmour) {
      loadoutActions.push({
        skip: false,
        type: "EQUIP",
        characterId,
        characterName: characterDescriptions[characterId]?.asString || "UNKNOWN CHARACTER",
        itemHash: exoticArmour.itemHash,
        itemName:
          allItemDefinitions[exoticArmour.itemHash]?.displayProperties.name ||
          "UNKNOWN EXOTIC ARMOUR",
        itemInstanceId: exoticArmour.itemInstanceId,
        socketIndex: null,
        plugItemHash: null,
        plugItemName: null
      });
    }

    const socketIndicesByItemHash: Record<number, number[]> = {};
    const plugItemHashesAndTypes = Object.entries(
      loadoutPlugs.reduce(
        (acc, plug) => ({ ...acc, [plug.itemHash]: plug.itemType }),
        {} as Record<number, string>
      )
    );

    logger.debug("Retrieving item socket indices ...");
    for (let plugItemIndex = 0; plugItemIndex < plugItemHashesAndTypes.length; plugItemIndex++) {
      const [itemHashStr, itemType] = plugItemHashesAndTypes[plugItemIndex];
      const itemHash = parseInt(itemHashStr, 10);

      if (itemType === "ARMOUR") {
        const [armourPlugItemSocketIndicesErr, armourPlugItemSocketIndices] =
          await this.plugService.getItemSocketIndices(itemHash, "ARMOR MODS");
        if (armourPlugItemSocketIndicesErr) {
          return [armourPlugItemSocketIndicesErr, null];
        }
        socketIndicesByItemHash[itemHash] = armourPlugItemSocketIndices;
      } else if (itemType === "SUBCLASS") {
        socketIndicesByItemHash[itemHash] = [];

        for (
          let socketNameIndex = 0;
          socketNameIndex < SUBCLASS_SOCKET_NAMES.length;
          socketNameIndex++
        ) {
          const socketName = SUBCLASS_SOCKET_NAMES[socketNameIndex] as SocketName;

          const [socketIndicesErr, socketIndices] = await this.plugService.getItemSocketIndices(
            itemHash,
            socketName
          );
          if (socketIndicesErr) {
            return [socketIndicesErr, null];
          }

          socketIndices.forEach((socketIndex) =>
            socketIndicesByItemHash[itemHash].push(socketIndex)
          );
        }
      }
    }

    logger.debug("Resolving socket actions ...");
    const socketActions2 = this.resolveSocketActions(
      allItemDefinitions,
      characterDescriptions,
      characterId,
      socketIndicesByItemHash,
      allItems.itemPlugHashes,
      loadoutPlugs
    );
    socketActions2.forEach((loadoutAction) => loadoutActions.push(loadoutAction));

    return [null, loadoutActions];
  }

  async applyLoadoutAction(
    loadoutAction: LoadoutAction,
    sessionId: string,
    membershipType: number
  ): Promise<Error | null> {
    if (loadoutAction.type === "DEPOSIT") {
      const transferErr = await this.destiny2ActionService.transferItemToVault(
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
      const transferErr = await this.destiny2ActionService.transferItemFromVault(
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
      const equipErr = await this.destiny2ActionService.equipItem(
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
        const socketErr = await this.plugService.insert(
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
  }

  // TODO: Can not de-exotic using an armour piece that the current character can not equip.
  private async resolveTransferActions(
    itemDefinitions: Record<string, DestinyInventoryItemDefinition>,
    characterDescriptions: Record<string, CharacterDescription>,
    characterId: string,
    equipmentItems: LoadoutItem[],
    characterItems: { equipped: DestinyItemComponent[]; unequipped: DestinyItemComponent[] },
    otherCharacterItems: Record<
      string,
      { equipped: DestinyItemComponent[]; unequipped: DestinyItemComponent[] }
    >,
    vaultItemsInfo: DestinyItemComponent[]
  ): Promise<[Error, null] | [null, LoadoutAction[]]> {
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
              item.itemHash === equipment.itemHash &&
              item.itemInstanceId === equipment.itemInstanceId
          )
        ) {
          actions.push({
            skip: false,
            type: "WITHDRAW",
            characterId: characterId,
            characterName: characterDescriptions[characterId]?.asString || "UNKNOWN CHARACTER",
            itemHash: equipment.itemHash,
            itemName: itemDefinitions[equipment.itemHash]?.displayProperties.name || "UNKNOWN ITEM",
            itemInstanceId: equipment.itemInstanceId,
            socketIndex: null,
            plugItemHash: null,
            plugItemName: null
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
              characterName:
                characterDescriptions[unequippedOtherCharacterId]?.asString || "UNKNOWN CHARACTER",
              itemHash: equipment.itemHash,
              itemName:
                itemDefinitions[equipment.itemHash]?.displayProperties.name || "UNKNOWN ITEM",
              itemInstanceId: equipment.itemInstanceId,
              socketIndex: null,
              plugItemHash: null,
              plugItemName: null
            });
            actions.push({
              skip: false,
              type: "WITHDRAW",
              characterId: characterId,
              characterName: characterDescriptions[characterId]?.asString || "UNKNOWN CHARACTER",
              itemHash: equipment.itemHash,
              itemName:
                itemDefinitions[equipment.itemHash]?.displayProperties.name || "UNKNOWN ITEM",
              itemInstanceId: equipment.itemInstanceId,
              socketIndex: null,
              plugItemHash: null,
              plugItemName: null
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
  }

  // TODO: For armour pieces, need to check if they're compatible with the
  //       current character.
  private resolveDeExoticActions(
    itemDefinitions: Record<number, DestinyInventoryItemDefinition>,
    characterDescriptions: Record<string, CharacterDescription>,
    characterId: string,
    extraEquipmentsItems: LoadoutItem[],
    otherCharacterItems: Record<
      string,
      { equipped: DestinyItemComponent[]; unequipped: DestinyItemComponent[] }
    >,
    vaultItems: DestinyItemComponent[],
    exoticItem: LoadoutItem
  ): [Error, null] | [null, LoadoutAction[]] {
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
        characterName: characterDescriptions[characterId]?.asString || "UNKNOWN CHARACTER",
        itemHash: extraNonExoticItem.itemHash,
        itemName:
          itemDefinitions[extraNonExoticItem.itemHash]?.displayProperties.name || "UNKNOWN ITEM",
        itemInstanceId: extraNonExoticItem.itemInstanceId,
        socketIndex: null,
        plugItemHash: null,
        plugItemName: null
      });
    } else {
      const vaultNonExoticItem =
        vaultItems.find(
          (item) =>
            this.getItemType(itemDefinitions, item.itemHash) === exoticItem.itemType &&
            this.getItemBucket(itemDefinitions, item.itemHash) === exoticItem.itemBucket &&
            !this.getItemIsExotic(itemDefinitions, item.itemHash)
        ) || null;
      if (vaultNonExoticItem) {
        actions.push({
          skip: false,
          type: "WITHDRAW",
          characterId: characterId,
          characterName: characterDescriptions[characterId]?.asString || "UNKNOWN CHARACTER",
          itemHash: vaultNonExoticItem.itemHash,
          itemName:
            itemDefinitions[vaultNonExoticItem.itemHash]?.displayProperties.name || "UNKNOWN ITEM",
          itemInstanceId: vaultNonExoticItem.itemInstanceId,
          socketIndex: null,
          plugItemHash: null,
          plugItemName: null
        });

        actions.push({
          skip: false,
          type: "EQUIP",
          characterId: characterId,
          characterName: characterDescriptions[characterId]?.asString || "UNKNOWN CHARACTER",
          itemHash: vaultNonExoticItem.itemHash,
          itemName:
            itemDefinitions[vaultNonExoticItem.itemHash]?.displayProperties.name || "UNKNOWN ITEM",
          itemInstanceId: vaultNonExoticItem.itemInstanceId,
          socketIndex: null,
          plugItemHash: null,
          plugItemName: null
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
                this.getItemType(itemDefinitions, item.itemHash) === exoticItem.itemType &&
                this.getItemBucket(itemDefinitions, item.itemHash) === exoticItem.itemBucket &&
                !this.getItemIsExotic(itemDefinitions, item.itemHash)
            ) || null;
          if (otherCharacterUnequippedNonExoticItem) {
            actions.push({
              skip: false,
              type: "DEPOSIT",
              characterId: otherCharacterId,
              characterName:
                characterDescriptions[otherCharacterId]?.asString || "UNKNOWN CHARACTER",
              itemHash: otherCharacterUnequippedNonExoticItem.itemHash,
              itemName:
                itemDefinitions[otherCharacterUnequippedNonExoticItem.itemHash]?.displayProperties
                  .name || "UNKNOWN ITEM",
              itemInstanceId: otherCharacterUnequippedNonExoticItem.itemInstanceId,
              socketIndex: null,
              plugItemHash: null,
              plugItemName: null
            });

            actions.push({
              skip: false,
              type: "WITHDRAW",
              characterId: characterId,
              characterName: characterDescriptions[characterId]?.asString || "UNKNOWN CHARACTER",
              itemHash: otherCharacterUnequippedNonExoticItem.itemHash,
              itemName:
                itemDefinitions[otherCharacterUnequippedNonExoticItem.itemHash]?.displayProperties
                  .name || "UNKNOWN ITEM",
              itemInstanceId: otherCharacterUnequippedNonExoticItem.itemInstanceId,
              socketIndex: null,
              plugItemHash: null,
              plugItemName: null
            });

            actions.push({
              skip: false,
              type: "EQUIP",
              characterId: characterId,
              characterName: characterDescriptions[characterId]?.asString || "UNKNOWN CHARACTER",
              itemHash: otherCharacterUnequippedNonExoticItem.itemHash,
              itemName:
                itemDefinitions[otherCharacterUnequippedNonExoticItem.itemHash]?.displayProperties
                  .name || "UNKNOWN ITEM",
              itemInstanceId: otherCharacterUnequippedNonExoticItem.itemInstanceId,
              socketIndex: null,
              plugItemHash: null,
              plugItemName: null
            });

            foundFromOtherCharacter = true;
            break;
          } else {
            const otherCharacterEquippedNonExoticItem =
              itemsInfo.equipped.find(
                (item) =>
                  this.getItemType(itemDefinitions, item.itemHash) === exoticItem.itemType &&
                  this.getItemBucket(itemDefinitions, item.itemHash) === exoticItem.itemBucket &&
                  !this.getItemIsExotic(itemDefinitions, item.itemHash)
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
  }

  private resolveEquipActions(
    itemDefinitions: Record<number, DestinyInventoryItemDefinition>,
    characterDescriptions: Record<string, CharacterDescription>,
    characterId: string,
    equipmentItems: LoadoutItem[],
    equippedItems: DestinyItemComponent[]
  ): LoadoutAction[] {
    return equipmentItems.map((item) => {
      const alreadyEquipped = !!equippedItems.find(
        (equipped) => equipped.itemInstanceId === item.itemInstanceId
      );

      return {
        skip: alreadyEquipped,
        type: "EQUIP",
        characterId,
        characterName: characterDescriptions[characterId]?.asString || "UNKNOWN CHARACTER",
        itemHash: item.itemHash,
        itemName: itemDefinitions[item.itemHash]?.displayProperties.name || "UNKNOWN ITEM",
        itemInstanceId: item.itemInstanceId,
        socketIndex: null,
        plugItemHash: null,
        plugItemName: null
      };
    });
  }

  private resolveSocketActions(
    itemDefinitions: Record<number, DestinyInventoryItemDefinition>,
    characterDescriptions: Record<string, CharacterDescription>,
    characterId: string,
    socketIndicesByItemHash: Record<number, number[]>,
    equippedPlugHashesByItemInstanceId: Record<string, number[]>,
    plugs: LoadoutPlug[]
  ): LoadoutAction[] {
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
        characterName: characterDescriptions[characterId]?.asString || "UNKNOWN CHARACTER",
        itemHash: plug.itemHash,
        itemName: itemDefinitions[plug.itemHash]?.displayProperties.name || "UNKNOWN ITEM",
        itemInstanceId: plug.itemInstanceId,
        socketIndex: plug.socketIndex,
        plugItemHash: plug.plugItemHash,
        plugItemName: itemDefinitions[plug.plugItemHash]?.displayProperties.name || "UNKNOWN PLUG"
      });
    });

    return loadoutActions;
  }

  private getLoadoutItem(
    itemDefinitions: Record<number, DestinyInventoryItemDefinition>,
    itemHash: number,
    itemInstanceId: string
  ): [Error, null] | [null, LoadoutItem] {
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
  }

  private getItemType(
    itemDefinitions: Record<number, DestinyInventoryItemDefinition>,
    itemHash: number
  ): LoadoutItemType {
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
  }

  private getItemBucket(
    itemDefinitions: Record<number, DestinyInventoryItemDefinition>,
    itemHash: number
  ): LoadoutItemBucket {
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
  }

  private getItemIsExotic(
    itemDefinitions: Record<number, DestinyInventoryItemDefinition>,
    itemHash: number
  ): boolean {
    return itemDefinitions[itemHash]?.inventory.tierTypeHash === EXOTIC_TIER_TYPE_HASH;
  }

  private getLogger(): Logger {
    return AppModule.getDefaultInstance().resolve(LogService).getLogger("LoadoutApplyService");
  }
}
