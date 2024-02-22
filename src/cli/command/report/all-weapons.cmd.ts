import {
  SessionIdCommandOptions,
  sessionIdOption,
  VerboseCommandOptions,
  verboseOption
} from "~src/cli/command-option/cli.option";
import { CommandDefinition, CommandOptionDefinition } from "~src/cli/d2cli.types";
import { SOCKET_TYPE_INTRINSIC_TRAITS } from "~src/enum/socket.enum";
import { getItemNameAndPowerLevel, ItemNameAndPowerLevel } from "~src/helper/item.helper";
import { makeTable2 } from "~src/helper/table.helper";
import { CharacterService } from "~src/service/character/character.service";
import { CharacterDescriptionService } from "~src/service/character-description/character-description.service";
import { InventoryService } from "~src/service/inventory/inventory.service";
import { ManifestDefinitionService } from "~src/service/manifest-definition/manifest-definition.service";
import {
  DestinyDamageTypeDefinition,
  DestinyInventoryItemDefinition
} from "~type/bungie-api/destiny/definitions.types";
import {
  DestinyItemComponent,
  DestinyItemInstanceComponent
} from "~type/bungie-api/destiny/entities/items.types";

import {
  ReportItem,
  reportItemsWeaponDamageTypeTagger,
  reportItemsWeaponFrameTagger,
  reportItemsWeaponSlotGrouper,
  reportItemsWeaponTierTagger,
  reportItemsWeaponTypeTagger,
  sortTableByColumns,
  transformFrameColumn,
  transformSlotColumn,
  transformTierColumn
} from "./all-weapons.helper";

export type ExcludeExoticCommandOptions = {
  excludeExotic: boolean;
};

export const excludeExoticOption: CommandOptionDefinition = {
  flags: ["ee", "exclude-exotic"],
  description: "Exclude exotic weapons from the report",
  defaultValue: false
};

export type DamageBeforeFrameCommandOptions = {
  damageBeforeFrame: boolean;
};

export const damageBeforeFrameOption: CommandOptionDefinition = {
  flags: ["df", "damage-before-frame"],
  description: "Show weapon damage before frame",
  defaultValue: false
};

type CmdOptions = SessionIdCommandOptions &
  VerboseCommandOptions &
  ExcludeExoticCommandOptions &
  DamageBeforeFrameCommandOptions;

const cmd: CommandDefinition = {
  description: "Report of all weapons across all characters and in vault",
  options: [sessionIdOption, verboseOption, excludeExoticOption, damageBeforeFrameOption],
  action: async (_, opts, { app, logger }) => {
    const { session: sessionId, verbose, excludeExotic, damageBeforeFrame } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const manifestDefinitionService = app.resolve(ManifestDefinitionService);

    const characterService = app.resolve(CharacterService);

    const characterDescriptionService = app.resolve(CharacterDescriptionService);

    const inventoryService = app.resolve(InventoryService);

    logger.info("Retrieving characters ...");
    const [charactersErr, characters] = await characterService.getCharacters(sessionId);
    if (charactersErr) {
      return logger.loggedError(`Unable to get characters: ${charactersErr.message}`);
    }
    if (characters.length <= 0) {
      return logger.loggedError("Missing characters");
    }

    logger.info("Retrieving character descriptions ...");
    const characterDescriptionById: Record<string, string> = {};
    for (const character of characters) {
      const [characterDescriptionErr, characterDescription] =
        await characterDescriptionService.getDescription(character);
      if (characterDescriptionErr) {
        return logger.loggedError(
          `Unable to retrieve character description: ${characterDescriptionErr.message}`
        );
      }
      characterDescriptionById[character.characterId] = characterDescription.asString;
    }

    const allItems: DestinyItemComponent[] = [];
    let allItemInstances: Record<string, DestinyItemInstanceComponent> = {};
    const allItemDefinitions: Record<string, DestinyInventoryItemDefinition> = {};
    const allItemDamageTypeDefinitions: Record<string, DestinyDamageTypeDefinition> = {};

    const reportItems: ReportItem[] = [];
    const groupReportItemsByWeaponSlot = reportItemsWeaponSlotGrouper(reportItems);
    const tagReportItemsWeaponDamageType = reportItemsWeaponDamageTypeTagger(reportItems);
    const tagReportItemsWeaponType = reportItemsWeaponTypeTagger(reportItems);
    const tagReportItemsWeaponFrame = reportItemsWeaponFrameTagger(reportItems);
    const tagReportItemsWeaponTier = reportItemsWeaponTierTagger(reportItems);

    for (const character of characters) {
      const characterDescription = characterDescriptionById[character.characterId];

      logger.info(`Retrieving equipment items for ${characterDescription} ...`);
      const [equipmentItemsErr, equipmentItems, equippedItemInstances] =
        await inventoryService.getEquipmentItems(
          sessionId,
          character.membershipType,
          character.membershipId,
          character.characterId
        );
      if (equipmentItemsErr) {
        return logger.loggedError(
          `Unable to retrieve equipment items for ${characterDescription}: ${equipmentItemsErr.message}`
        );
      }
      allItems.push(...equipmentItems);
      allItemInstances = { ...allItemInstances, ...equippedItemInstances };

      logger.info(`Retrieving inventory items for ${characterDescription} ...`);
      const [inventoryItemsErr, inventoryItems, inventoryItemInstances] =
        await inventoryService.getInventoryItems(
          sessionId,
          character.membershipType,
          character.membershipId,
          character.characterId
        );
      if (inventoryItemsErr) {
        return logger.loggedError(
          `Unable to retrieve inventory items for ${characterDescription}: ${inventoryItemsErr.message}`
        );
      }
      allItems.push(...inventoryItems);
      allItemInstances = { ...allItemInstances, ...inventoryItemInstances };
    }

    logger.info("Retrieving vault items ...");
    const [vaultItemsErr, vaultItems, vaultItemInstances] = await inventoryService.getVaultItems(
      sessionId,
      characters[0].membershipType,
      characters[0].membershipId
    );
    if (vaultItemsErr) {
      return logger.loggedError(`Unable to retrieve vault items: ${vaultItemsErr.message}`);
    }
    allItems.push(...vaultItems);
    allItemInstances = { ...allItemInstances, ...vaultItemInstances };

    logger.info("Retrieving item definitions ...");
    for (const item of allItems) {
      const [itemDefinitionErr, itemDefinition] = await manifestDefinitionService.getItemDefinition(
        item.itemHash
      );
      if (itemDefinitionErr) {
        return logger.loggedError(
          `Unable to retrieve item definition for ${item.itemHash}: ${itemDefinitionErr.message}`
        );
      }
      allItemDefinitions[`${item.itemHash}:${item.itemInstanceId}`] = itemDefinition;
    }
    groupReportItemsByWeaponSlot(allItemDefinitions);
    tagReportItemsWeaponType(allItemDefinitions);
    tagReportItemsWeaponTier(allItemDefinitions);

    logger.info("Retrieving item damage type definitions ...");
    for (const reportItem of reportItems) {
      const itemDefinition =
        allItemDefinitions[`${reportItem.itemHash}:${reportItem.itemInstanceId}`];

      if (!itemDefinition.damageTypeHashes || itemDefinition.damageTypeHashes.length <= 0) {
        return logger.loggedError(`Item missing damage type hashes: ${reportItem.itemHash}`);
      }

      if (itemDefinition.damageTypeHashes.length > 1) {
        return logger.loggedError(`Item has more than 1 damage type hash: ${reportItem.itemHash}`);
      }

      // Although the data structure for damage type is an array (for some reason), it only ever
      // has 1 value. So we're just taking the 1st value out of the array.
      const [damageTypeDefinitionErr, damageTypeDefinition] =
        await manifestDefinitionService.getDamageTypeDefinition(itemDefinition.damageTypeHashes[0]);
      if (damageTypeDefinitionErr) {
        return logger.loggedError(
          `Unable to retrieve item damage type definition for ${reportItem.itemHash}: ${damageTypeDefinitionErr.message}`
        );
      }
      allItemDamageTypeDefinitions[reportItem.itemHash] = damageTypeDefinition;
    }
    tagReportItemsWeaponDamageType(allItemDamageTypeDefinitions);

    logger.info("Retrieving item intrinsic trait socket item definitions ...");
    for (const reportItem of reportItems) {
      const itemDefinition =
        allItemDefinitions[`${reportItem.itemHash}:${reportItem.itemInstanceId}`];

      const intrinsicTraitSocket = (itemDefinition.sockets?.socketEntries || []).find(
        ({ socketTypeHash }) => socketTypeHash === SOCKET_TYPE_INTRINSIC_TRAITS
      );
      if (!intrinsicTraitSocket) {
        return logger.loggedError(
          `Missing intrinsic trait socket for item: ${reportItem.itemHash}`
        );
      }

      const [socketItemDefinitionErr, socketItemDefinition] =
        await manifestDefinitionService.getItemDefinition(
          intrinsicTraitSocket.singleInitialItemHash
        );
      if (socketItemDefinitionErr) {
        return logger.loggedError(
          `Unable to retrieve item intrinsic trait socket for item definition for ${reportItem.itemHash}: ${socketItemDefinitionErr.message}`
        );
      }
      allItemDefinitions[`${socketItemDefinition.hash}:`] = socketItemDefinition;
    }
    tagReportItemsWeaponFrame(allItemDefinitions);

    const tableData: string[][] = [];

    tableData.push([
      ...(excludeExotic ? [] : ["Tier"]),
      "Slot",
      "Type",
      ...(damageBeforeFrame ? ["Damage", "Frame"] : ["Frame", "Damage"]),
      "Item",
      "Light",
      ...(verbose ? ["ID"] : [])
    ]);

    const findTagPrefixedValue = (tags: string[], prefix: string) => {
      return tags.find((tag) => tag.split(":", 2)[0] === prefix)?.split(":", 2)[1] || "N/A";
    };

    const tableRows: string[][] = [];
    for (const reportItem of reportItems) {
      const itemDefinition =
        allItemDefinitions[`${reportItem.itemHash}:${reportItem.itemInstanceId}`];

      const itemInfo: ItemNameAndPowerLevel = getItemNameAndPowerLevel(
        itemDefinition || null,
        allItemInstances[reportItem.itemInstanceId] || null
      );

      const tierValue = findTagPrefixedValue(reportItem.tags, "Tier");
      if (excludeExotic && tierValue === "Exotic") {
        continue;
      }

      tableRows.push([
        ...(excludeExotic ? [] : [tierValue]),
        findTagPrefixedValue(reportItem.tags, "Slot"),
        findTagPrefixedValue(reportItem.tags, "Type"),
        ...(damageBeforeFrame
          ? [
              findTagPrefixedValue(reportItem.tags, "Damage"),
              findTagPrefixedValue(reportItem.tags, "Frame")
            ]
          : [
              findTagPrefixedValue(reportItem.tags, "Frame"),
              findTagPrefixedValue(reportItem.tags, "Damage")
            ]),
        itemInfo.label,
        itemInfo.powerLevel,
        ...(verbose ? [`${reportItem.itemHash}:${reportItem.itemInstanceId}`] : [])
      ]);
    }

    tableData.push(
      ...sortTableByColumns(
        tableRows,
        excludeExotic
          ? { 0: transformSlotColumn, [damageBeforeFrame ? 3 : 2]: transformFrameColumn }
          : {
              0: transformTierColumn,
              1: transformSlotColumn,
              [damageBeforeFrame ? 4 : 3]: transformFrameColumn
            }
      )
    );
    logger.log(makeTable2(tableData));
  }
};

export default cmd;
