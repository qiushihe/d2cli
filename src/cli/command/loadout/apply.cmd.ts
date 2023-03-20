import chalk from "chalk";
import fs from "fs";
import path from "path";

import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { verboseOption } from "~src/cli/command-option/cli.option";
import { VerboseCommandOptions } from "~src/cli/command-option/cli.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { fnWithSpinner } from "~src/helper/cli-promise.helper";
import { getSelectedCharacterInfo } from "~src/helper/current-character.helper";
import { InventoryBucket } from "~src/helper/inventory-bucket.helper";
import { ArmourBucketHashes } from "~src/helper/inventory-bucket.helper";
import { WeaponBucketHashes } from "~src/helper/inventory-bucket.helper";
import { InventoryBucketHashes } from "~src/helper/inventory-bucket.helper";
import { promisedFn } from "~src/helper/promise.helper";
import { stringifyTable } from "~src/helper/table.helper";
import { AppModule } from "~src/module/app.module";
import { CharacterDescriptionService } from "~src/service/character-description/character-description.service";
import { Destiny2CharacterService } from "~src/service/destiny2-character/destiny2-character.service";
import { Destiny2InventoryService } from "~src/service/destiny2-inventory/destiny2-inventory.service";
import { Destiny2InventoryEquipmentService } from "~src/service/destiny2-inventory-equipment/destiny2-inventory-equipment.service";
import { Destiny2InventoryTransferService } from "~src/service/destiny2-inventory-transfer/destiny2-inventory-transfer.service";
import { Destiny2ManifestService } from "~src/service/destiny2-manifest/destiny2-manifest.service";
import { Destiny2PlugService } from "~src/service/destiny2-plug/destiny2-plug.service";
import { LogService } from "~src/service/log/log.service";
import { DestinyInventoryItemDefinition } from "~type/bungie-api/destiny/definitions.types";
import { DestinyItemComponent } from "~type/bungie-api/destiny/entities/items.types";
import { Destiny2ManifestLanguage } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestComponent } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestInventoryItemDefinitions } from "~type/bungie-asset/destiny2.types";

type CmdOptions = SessionIdCommandOptions &
  VerboseCommandOptions & { file: string; dryRun: boolean };

type ItemType = "SUBCLASS" | "WEAPON" | "ARMOUR" | "OTHER";

type ItemBucket =
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

type ItemInfo = {
  itemType: ItemType;
  itemBucket: ItemBucket;
  itemName: string;
  itemHash: number;
  itemInstanceId: string;
  isItemExotic: boolean;
};

const EXOTIC_TIER_TYPE_HASH = 2759499571;

const getItemInfo = (
  itemDefinition: DestinyInventoryItemDefinition,
  itemHash: number,
  itemInstanceId: string
): [Error, null] | [null, ItemInfo] => {
  const bucketHash = itemDefinition.inventory.bucketTypeHash;

  let itemType: ItemType;
  if (bucketHash === InventoryBucketHashes[InventoryBucket.Subclass]) {
    itemType = "SUBCLASS";
  } else if (ArmourBucketHashes.includes(bucketHash)) {
    itemType = "ARMOUR";
  } else if (WeaponBucketHashes.includes(bucketHash)) {
    itemType = "WEAPON";
  } else {
    itemType = "OTHER";
  }

  let itemBucket: ItemBucket;
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

const getItemsInfo = (
  itemDefinitions: Destiny2ManifestInventoryItemDefinitions,
  items: DestinyItemComponent[]
): [Error, null] | [null, ItemInfo[]] => {
  const itemsInfo: ItemInfo[] = [];

  for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
    const item = items[itemIndex];
    const itemDefinition = itemDefinitions[item.itemHash];

    if (!itemDefinition) {
      return [new Error(`Unable to find item definition for: ${item.itemHash}`), null];
    }

    const [itemInfoErr, itemInfo] = getItemInfo(itemDefinition, item.itemHash, item.itemInstanceId);
    if (itemInfoErr) {
      return [new Error(`Unable to get item equipment info for: ${itemInfoErr.message}`), null];
    }

    itemsInfo.push(itemInfo);
  }

  return [null, itemsInfo];
};

type LoadoutSocket = {
  label: string;
  itemHash: number;
  itemInstanceId: string;
  socketIndex: number;
  plugItemHash: number;
};

const getCharacterItemIds = async (
  itemDefinitions: Destiny2ManifestInventoryItemDefinitions,
  destiny2InventoryService: Destiny2InventoryService,
  sessionId: string,
  membershipType: number,
  membershipId: string,
  characterId: string
): Promise<[Error, null, null] | [null, ItemInfo[], ItemInfo[]]> => {
  const [equipmentItemsErr, equipmentItems] = await destiny2InventoryService.getEquipmentItems(
    sessionId,
    membershipType,
    membershipId,
    characterId
  );
  if (equipmentItemsErr) {
    return [equipmentItemsErr, null, null];
  }

  const [inventoryItemsErr, inventoryItems] = await destiny2InventoryService.getInventoryItems(
    sessionId,
    membershipType,
    membershipId,
    characterId
  );
  if (inventoryItemsErr) {
    return [inventoryItemsErr, null, null];
  }

  const [equippedInfoErr, equippedInfo] = getItemsInfo(itemDefinitions, equipmentItems);
  if (equippedInfoErr) {
    return [equippedInfoErr, null, null];
  }

  const [unequippedInfoErr, unequippedInfo] = getItemsInfo(itemDefinitions, inventoryItems);
  if (unequippedInfoErr) {
    return [unequippedInfoErr, null, null];
  }

  return [null, equippedInfo, unequippedInfo];
};

type LoadoutStepType = "DEPOSIT" | "WITHDRAW" | "EQUIP" | "SOCKET";

type LoadoutAction = {
  type: LoadoutStepType;
  characterId: string;
  itemName: string;
  itemHash: number;
  itemInstanceId: string;
  socketIndex: number | null;
  plugItemName: string | null;
  plugItemHash: number | null;
};

const resolveTransferActions = async (
  itemDefinitions: Destiny2ManifestInventoryItemDefinitions,
  characterId: string,
  equipmentsInfo: ItemInfo[],
  characterItemsInfo: { equipped: ItemInfo[]; unequipped: ItemInfo[] },
  otherCharacterItemsInfo: Record<string, { equipped: ItemInfo[]; unequipped: ItemInfo[] }>,
  vaultItemsInfo: ItemInfo[]
): Promise<[Error, null] | [null, LoadoutAction[]]> => {
  const actions: LoadoutAction[] = [];

  for (let equipmentIndex = 0; equipmentIndex < equipmentsInfo.length; equipmentIndex++) {
    const equipment = equipmentsInfo[equipmentIndex];

    if (
      !characterItemsInfo.equipped.find(
        (item) =>
          item.itemHash === equipment.itemHash && item.itemInstanceId === equipment.itemInstanceId
      ) &&
      !characterItemsInfo.unequipped.find(
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
          Object.keys(otherCharacterItemsInfo).find((characterId) =>
            otherCharacterItemsInfo[characterId].unequipped.find(
              (item) =>
                item.itemHash === equipment.itemHash &&
                item.itemInstanceId === equipment.itemInstanceId
            )
          ) || null;
        if (unequippedOtherCharacterId) {
          actions.push({
            type: "DEPOSIT",
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
            Object.keys(otherCharacterItemsInfo).find((characterId) =>
              otherCharacterItemsInfo[characterId].equipped.find(
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

const resolveDeExoticActions = (
  characterId: string,
  extraEquipmentsInfo: ItemInfo[],
  otherCharacterItemsInfo: Record<string, { equipped: ItemInfo[]; unequipped: ItemInfo[] }>,
  vaultItemsInfo: ItemInfo[],
  itemType: ItemType,
  itemBucket: ItemBucket
): [Error, null] | [null, LoadoutAction[]] => {
  const actions: LoadoutAction[] = [];

  const extraNonExoticItem =
    extraEquipmentsInfo.find(
      (item) => item.itemType === itemType && item.itemBucket === itemBucket && !item.isItemExotic
    ) || null;
  if (extraNonExoticItem) {
    actions.push({
      type: "EQUIP",
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
      vaultItemsInfo.find(
        (item) => item.itemType === itemType && item.itemBucket === itemBucket && !item.isItemExotic
      ) || null;
    if (vaultNonExoticItem) {
      actions.push({
        type: "WITHDRAW",
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
      const otherCharacterIds = Object.keys(otherCharacterItemsInfo);

      for (
        let otherCharacterIndex = 0;
        otherCharacterIndex < otherCharacterIds.length;
        otherCharacterIndex++
      ) {
        const otherCharacterId = otherCharacterIds[otherCharacterIndex];
        const itemsInfo = otherCharacterItemsInfo[otherCharacterId];

        const otherCharacterUnequippedNonExoticItem =
          itemsInfo.unequipped.find(
            (item) =>
              item.itemType === itemType && item.itemBucket === itemBucket && !item.isItemExotic
          ) || null;
        if (otherCharacterUnequippedNonExoticItem) {
          actions.push({
            type: "DEPOSIT",
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

const applyLoadoutAction = async (
  destiny2InventoryTransferService: Destiny2InventoryTransferService,
  destiny2InventoryEquipmentService: Destiny2InventoryEquipmentService,
  destiny2PlugService: Destiny2PlugService,
  loadoutAction: LoadoutAction,
  sessionId: string,
  membershipType: number
): Promise<Error | null> => {
  if (loadoutAction.type === "DEPOSIT") {
    const transferErr = await fnWithSpinner(
      `Moving ${loadoutAction.itemName} into the vault ...`,
      () =>
        destiny2InventoryTransferService.transferToVault(
          sessionId,
          membershipType,
          loadoutAction.characterId,
          loadoutAction.itemHash,
          loadoutAction.itemInstanceId
        )
    );
    if (transferErr) {
      return transferErr;
    }
  } else if (loadoutAction.type === "WITHDRAW") {
    const transferErr = await fnWithSpinner(
      `Moving ${loadoutAction.itemName} out of the vault ...`,
      () =>
        destiny2InventoryTransferService.transferFromVault(
          sessionId,
          membershipType,
          loadoutAction.characterId,
          loadoutAction.itemHash,
          loadoutAction.itemInstanceId
        )
    );
    if (transferErr) {
      return transferErr;
    }
  } else if (loadoutAction.type === "EQUIP") {
    const equipErr = await fnWithSpinner(`Equipping ${loadoutAction.itemName} ...`, () =>
      destiny2InventoryEquipmentService.equip(
        sessionId,
        membershipType,
        loadoutAction.characterId,
        loadoutAction.itemInstanceId
      )
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
      const socketErr = await fnWithSpinner(
        `Inserting ${loadoutAction.plugItemName} into slot #${socketIndex + 1} of ${
          loadoutAction.itemName
        } ...`,
        () =>
          destiny2PlugService.insert(
            sessionId,
            membershipType,
            loadoutAction.characterId,
            loadoutAction.itemInstanceId,
            socketIndex,
            plugItemHash
          )
      );
      if (socketErr) {
        return socketErr;
      }
    }
  }
  return null;
};

const cmd: CommandDefinition = {
  description: "Apply a loadout to the current character",
  options: [
    sessionIdOption,
    verboseOption,
    {
      flags: ["f", "file <path>"],
      description: "Path to the loadout file to apply",
      defaultValue: ""
    },
    {
      flags: ["dry-run"],
      description: "Only list the expected loadout actions without applying them",
      defaultValue: false
    }
  ],
  action: async (_, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:loadout:apply");

    const { session: sessionId, verbose, file, dryRun } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const destiny2ManifestService =
      AppModule.getDefaultInstance().resolve<Destiny2ManifestService>("Destiny2ManifestService");

    const destiny2CharacterService =
      AppModule.getDefaultInstance().resolve<Destiny2CharacterService>("Destiny2CharacterService");

    const destiny2InventoryService =
      AppModule.getDefaultInstance().resolve<Destiny2InventoryService>("Destiny2InventoryService");

    const characterDescriptionService =
      AppModule.getDefaultInstance().resolve<CharacterDescriptionService>(
        "CharacterDescriptionService"
      );

    const destiny2InventoryTransferService =
      AppModule.getDefaultInstance().resolve<Destiny2InventoryTransferService>(
        "Destiny2InventoryTransferService"
      );

    const destiny2InventoryEquipmentService =
      AppModule.getDefaultInstance().resolve<Destiny2InventoryEquipmentService>(
        "Destiny2InventoryEquipmentService"
      );

    const destiny2PlugService =
      AppModule.getDefaultInstance().resolve<Destiny2PlugService>("Destiny2PlugService");

    const [characterInfoErr, characterInfo] = await getSelectedCharacterInfo(logger, sessionId);
    if (characterInfoErr) {
      return logger.loggedError(`Unable to get character info: ${characterInfoErr.message}`);
    }

    const [itemDefinitionsErr, itemDefinitions] = await fnWithSpinner(
      "Retrieving inventory item definitions ...",
      () =>
        destiny2ManifestService.getManifestComponent<Destiny2ManifestInventoryItemDefinitions>(
          Destiny2ManifestLanguage.English,
          Destiny2ManifestComponent.InventoryItemDefinition
        )
    );
    if (itemDefinitionsErr) {
      return logger.loggedError(
        `Unable to retrieve inventory item definitions: ${itemDefinitionsErr.message}`
      );
    }

    const loadoutFilePath = path.isAbsolute(file) ? file : path.resolve(process.cwd(), file);

    const [fileContentErr, fileContent] = await fnWithSpinner("Reading loadout file ...", () =>
      promisedFn(
        () =>
          new Promise<string>((resolve, reject) => {
            fs.readFile(loadoutFilePath, "utf8", (err, data) => {
              err ? reject(err) : resolve(data);
            });
          })
      )
    );
    if (fileContentErr) {
      return logger.loggedError(`Unable to read loadout file: ${fileContentErr.message}`);
    }

    const loadoutLines = `${fileContent}`
      .trim()
      .split("\n")
      .map((line) => `${line}`.trim())
      .filter((line) => line.length > 0);

    let loadoutName = "";
    const loadoutEquipments: ItemInfo[] = [];
    const loadoutExtraEquipments: ItemInfo[] = [];
    const loadoutSockets: LoadoutSocket[] = [];

    for (let lineIndex = 0; lineIndex < loadoutLines.length; lineIndex++) {
      const line = loadoutLines[lineIndex];
      const metaLineMatch = line.match(/^LOADOUT\s*\/\/(.*)$/);
      if (metaLineMatch) {
        loadoutName = `${metaLineMatch[1]}`.trim();
      } else {
        const dataLineMatch = line.match(/^([^/]+)\s*\/\/([^/]*)\s*\/\/(.*)$/);
        if (dataLineMatch) {
          const dataType = `${dataLineMatch[1]}`.trim();
          const dataValue = `${dataLineMatch[2]}`.trim();
          const dataLabel = `${dataLineMatch[3]}`.trim();

          if (dataType === "EQUIP") {
            const dataParts = dataValue.split(":", 2);
            const itemHash = parseInt(`${dataParts[0]}`.trim(), 10);
            const itemInstanceId = `${dataParts[1]}`.trim().replace(/\D/gi, "");
            const itemDefinition = itemDefinitions[itemHash];

            if (!itemDefinition) {
              return logger.loggedError(`Unable to find item definition for: ${itemHash}`);
            }

            const [itemInfoErr, itemInfo] = getItemInfo(itemDefinition, itemHash, itemInstanceId);
            if (itemInfoErr) {
              return logger.loggedError(
                `Unable to get item equipment info for: ${itemInfoErr.message}`
              );
            }

            loadoutEquipments.push(itemInfo);
          } else if (dataType === "EXTRA") {
            const dataParts = dataValue.split(":", 2);
            const itemHash = parseInt(`${dataParts[0]}`.trim(), 10);
            const itemInstanceId = `${dataParts[1]}`.trim().replace(/\D/gi, "");
            const itemDefinition = itemDefinitions[itemHash];

            if (!itemDefinition) {
              return logger.loggedError(`Unable to find extra item definition for: ${itemHash}`);
            }

            const [itemInfoErr, itemInfo] = getItemInfo(itemDefinition, itemHash, itemInstanceId);
            if (itemInfoErr) {
              return logger.loggedError(
                `Unable to get extra item equipment info for: ${itemInfoErr.message}`
              );
            }

            loadoutExtraEquipments.push(itemInfo);
          } else if (dataType === "SOCKET") {
            const dataParts = dataValue.split("::", 3);
            const itemParts = `${dataParts[0]}`.trim().split(":", 2);
            const indexParts = `${dataParts[1]}`.trim().split(":", 2);
            const plugParts = `${dataParts[2]}`.trim().split(":", 2);
            const itemHash = parseInt(`${itemParts[0]}`.trim(), 10);
            const itemInstanceId = `${itemParts[1]}`.trim().replace(/\D/gi, "");
            const socketIndex = parseInt(`${indexParts[1]}`.trim(), 10);
            const plugItemHash = parseInt(`${plugParts[1]}`.trim(), 10);

            loadoutSockets.push({
              label: dataLabel,
              itemHash,
              itemInstanceId,
              socketIndex,
              plugItemHash
            });
          }
        }
      }
    }

    const [charactersErr, characters] = await fnWithSpinner("Fetching characters ...", () =>
      destiny2CharacterService.getCharacters(sessionId)
    );
    if (charactersErr) {
      return logger.loggedError(`Unable to fetch characters: ${charactersErr.message}`);
    }

    const characterDescriptions: Record<string, string> = {};
    for (let characterIndex = 0; characterIndex < characters.length; characterIndex++) {
      const character = characters[characterIndex];
      const [characterDescriptionErr, characterDescription] = await fnWithSpinner(
        "Retrieving character description ...",
        () => characterDescriptionService.getDescription(character)
      );
      if (characterDescriptionErr) {
        return logger.loggedError(
          `Unable to fetch character description: ${characterDescriptionErr.message}`
        );
      }

      characterDescriptions[
        character.characterId
      ] = `${characterDescription.gender} ${characterDescription?.race} ${characterDescription?.class}`;
    }

    const otherCharacterItemsInfo: Record<
      string,
      { equipped: ItemInfo[]; unequipped: ItemInfo[] }
    > = {};

    const [characterItemIdsErr, characterEquippedItemIds, characterUnequippedItemIds] =
      await fnWithSpinner(
        `Fetching equipped items for character ${
          characterDescriptions[characterInfo.characterId]
        } ...`,
        () =>
          getCharacterItemIds(
            itemDefinitions,
            destiny2InventoryService,
            sessionId,
            characterInfo.membershipType,
            characterInfo.membershipId,
            characterInfo.characterId
          )
      );
    if (characterItemIdsErr) {
      return logger.loggedError(
        `Unable to fetch equipped items for ${characterDescriptions[characterInfo.characterId]}: ${
          characterItemIdsErr.message
        }`
      );
    }

    const characterItemsInfo = {
      equipped: characterEquippedItemIds,
      unequipped: characterUnequippedItemIds
    };

    const otherCharacterIds = characters
      .filter((character) => character.characterId !== characterInfo.characterId)
      .map((character) => character.characterId);

    for (
      let otherCharacterIndex = 0;
      otherCharacterIndex < otherCharacterIds.length;
      otherCharacterIndex++
    ) {
      const otherCharacterId = otherCharacterIds[otherCharacterIndex];

      const [characterItemIdsErr, characterEquippedItemIds, characterUnequippedItemIds] =
        await fnWithSpinner(
          `Fetching unequipped items for character ${
            characterDescriptions[characterInfo.characterId]
          } ...`,
          () =>
            getCharacterItemIds(
              itemDefinitions,
              destiny2InventoryService,
              sessionId,
              characterInfo.membershipType,
              characterInfo.membershipId,
              otherCharacterId
            )
        );
      if (characterItemIdsErr) {
        return logger.loggedError(
          `Unable to fetch unequipped items for character ${
            characterDescriptions[characterInfo.characterId]
          }: ${characterItemIdsErr.message}`
        );
      }

      otherCharacterItemsInfo[otherCharacterId] = {
        equipped: characterEquippedItemIds,
        unequipped: characterUnequippedItemIds
      };
    }

    const [vaultItemsErr, vaultItems] = await fnWithSpinner("Retrieving vault items ...", () =>
      destiny2InventoryService.getVaultItems(
        sessionId,
        characterInfo.membershipType,
        characterInfo.membershipId
      )
    );
    if (vaultItemsErr) {
      return logger.loggedError(
        `Unable to retrieve profile inventory items: ${vaultItemsErr.message}`
      );
    }

    const [vaultItemsInfoErr, vaultItemsInfo] = getItemsInfo(itemDefinitions, vaultItems);
    if (vaultItemsInfoErr) {
      return logger.loggedError(`Unable to get vault items info: ${vaultItemsInfoErr.message}`);
    }

    const loadoutActions: LoadoutAction[] = [];

    const [equipmentTransferActionsErr, equipmentTransferActions] = await fnWithSpinner(
      "Resolving equipment transfer actions ...",
      () =>
        resolveTransferActions(
          itemDefinitions,
          characterInfo.characterId,
          loadoutEquipments,
          characterItemsInfo,
          otherCharacterItemsInfo,
          vaultItemsInfo
        )
    );
    if (equipmentTransferActionsErr) {
      return logger.loggedError(
        `Unable to resolve equipment transfer actions: ${equipmentTransferActionsErr.message}`
      );
    }
    equipmentTransferActions.forEach((action) => loadoutActions.push(action));

    const [extraEquipmentTransferActionsErr, extraEquipmentTransferActions] = await fnWithSpinner(
      "Resolving extra equipment transfer actions ...",
      () =>
        resolveTransferActions(
          itemDefinitions,
          characterInfo.characterId,
          loadoutExtraEquipments,
          characterItemsInfo,
          otherCharacterItemsInfo,
          vaultItemsInfo
        )
    );
    if (extraEquipmentTransferActionsErr) {
      return logger.loggedError(
        `Unable to resolve extra equipment transfer actions: ${extraEquipmentTransferActionsErr.message}`
      );
    }
    extraEquipmentTransferActions.forEach((action) => loadoutActions.push(action));

    const exoticWeaponEquipment =
      loadoutEquipments.find((item) => item.itemType === "WEAPON" && item.isItemExotic) || null;
    if (exoticWeaponEquipment) {
      const [deExoticActionsErr, deExoticActions] = resolveDeExoticActions(
        characterInfo.characterId,
        loadoutExtraEquipments,
        otherCharacterItemsInfo,
        vaultItemsInfo,
        "WEAPON",
        exoticWeaponEquipment.itemBucket
      );
      if (deExoticActionsErr) {
        return logger.loggedError(
          `Unable to resolve de-exotic weapon actions: ${deExoticActionsErr.message}`
        );
      }
      deExoticActions.forEach((action) => loadoutActions.push(action));
    }

    const exoticArmourEquipment =
      loadoutEquipments.find((item) => item.itemType === "ARMOUR" && item.isItemExotic) || null;
    if (exoticArmourEquipment) {
      const [deExoticActionsErr, deExoticActions] = resolveDeExoticActions(
        characterInfo.characterId,
        loadoutExtraEquipments,
        otherCharacterItemsInfo,
        vaultItemsInfo,
        "ARMOUR",
        exoticArmourEquipment.itemBucket
      );
      if (deExoticActionsErr) {
        return logger.loggedError(
          `Unable to resolve de-exotic armour actions: ${deExoticActionsErr.message}`
        );
      }
      deExoticActions.forEach((action) => loadoutActions.push(action));
    }

    loadoutEquipments
      .filter((item) => !item.isItemExotic)
      .forEach((item) => {
        loadoutActions.push({
          type: "EQUIP",
          characterId: characterInfo.characterId,
          itemName: item.itemName,
          itemHash: item.itemHash,
          itemInstanceId: item.itemInstanceId,
          socketIndex: null,
          plugItemName: null,
          plugItemHash: null
        });
      });

    loadoutEquipments
      .filter((item) => item.isItemExotic)
      .forEach((item) => {
        loadoutActions.push({
          type: "EQUIP",
          characterId: characterInfo.characterId,
          itemName: item.itemName,
          itemHash: item.itemHash,
          itemInstanceId: item.itemInstanceId,
          socketIndex: null,
          plugItemName: null,
          plugItemHash: null
        });
      });

    loadoutSockets.forEach((loadoutSocket) => {
      const itemDefinition = itemDefinitions[loadoutSocket.itemHash];
      const plugItemDefinition = itemDefinitions[loadoutSocket.plugItemHash];

      loadoutActions.push({
        type: "SOCKET",
        characterId: characterInfo.characterId,
        itemName: itemDefinition?.displayProperties.name || "UNKNOWN ITEM",
        itemHash: loadoutSocket.itemHash,
        itemInstanceId: loadoutSocket.itemInstanceId,
        socketIndex: loadoutSocket.socketIndex,
        plugItemName: plugItemDefinition?.displayProperties.name || "UNKNOWN PLUG",
        plugItemHash: loadoutSocket.plugItemHash
      });
    });

    logger.log(`Loadout: ${loadoutName}`);

    const tableData: string[][] = [];

    const tableHeader = [];
    if (!dryRun) {
      tableHeader.push("Success?");
    }
    tableHeader.push("Character");
    tableHeader.push("Action");
    tableHeader.push("Item");
    if (verbose) {
      tableHeader.push("Item ID");
    }
    tableHeader.push("Socket");
    tableHeader.push("Plug");
    if (verbose) {
      tableHeader.push("Plug ID");
    }
    if (!dryRun) {
      tableHeader.push("Message");
    }
    tableData.push(tableHeader);

    for (let actionIndex = 0; actionIndex < loadoutActions.length; actionIndex++) {
      const loadoutAction = loadoutActions[actionIndex];
      let actionSuccess: boolean;
      let actionMessage: string;

      if (!dryRun) {
        const loadoutActionErr = await applyLoadoutAction(
          destiny2InventoryTransferService,
          destiny2InventoryEquipmentService,
          destiny2PlugService,
          loadoutAction,
          sessionId,
          characterInfo.membershipType
        );
        if (loadoutActionErr) {
          actionSuccess = false;
          actionMessage = loadoutActionErr.message;
        } else {
          actionSuccess = true;
          actionMessage = "";
        }
      } else {
        actionSuccess = false;
        actionMessage = "";
      }

      const tableRow = [];
      if (!dryRun) {
        tableRow.push(actionSuccess ? chalk.bgGreen(" Yes ") : chalk.bgRed(" No "));
      }
      tableRow.push(characterDescriptions[loadoutAction.characterId]);
      tableRow.push(loadoutAction.type);
      tableRow.push(loadoutAction.itemName);
      if (verbose) {
        tableRow.push(`${loadoutAction.itemHash}:${loadoutAction.itemInstanceId}`);
      }
      tableRow.push(loadoutAction.socketIndex !== null ? `${loadoutAction.socketIndex + 1}` : "");
      tableRow.push(loadoutAction.plugItemName || "");
      if (verbose) {
        tableRow.push(loadoutAction.plugItemHash ? `${loadoutAction.plugItemHash}` : "");
      }
      if (!dryRun) {
        tableRow.push(actionMessage);
      }
      tableData.push(tableRow);
    }

    logger.log(stringifyTable(tableData));
  }
};

export default cmd;
