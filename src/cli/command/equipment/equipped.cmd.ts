import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { verboseOption } from "~src/cli/command-option/cli.option";
import { VerboseCommandOptions } from "~src/cli/command-option/cli.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { InventoryBucketLabels } from "~src/helper/inventory-bucket.helper";
import { EquipmentBuckets } from "~src/helper/inventory-bucket.helper";
import { groupEquipmentItems } from "~src/helper/inventory-bucket.helper";
import { ItemNameAndPowerLevel } from "~src/helper/item.helper";
import { getItemNameAndPowerLevel } from "~src/helper/item.helper";
import { makeTable2 } from "~src/helper/table.helper";
import { CharacterSelectionService } from "~src/service/character-selection/character-selection.service";
import { InventoryService } from "~src/service/inventory/inventory.service";
import { ManifestDefinitionService } from "~src/service/manifest-definition/manifest-definition.service";

type CmdOptions = SessionIdCommandOptions & VerboseCommandOptions;

const cmd: CommandDefinition = {
  description: "List currently equipped items in character inventory",
  options: [sessionIdOption, verboseOption],
  action: async (_, opts, { app, logger }) => {
    const { session: sessionId, verbose } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const manifestDefinitionService = app.resolve(ManifestDefinitionService);

    const characterSelectionService = app.resolve(CharacterSelectionService);

    const inventoryService = app.resolve(InventoryService);

    const [characterInfoErr, characterInfo] =
      await characterSelectionService.ensureSelectedCharacter(sessionId);
    if (characterInfoErr) {
      return logger.loggedError(`Unable to get character info: ${characterInfoErr.message}`);
    }

    logger.info("Retrieving equipment items ...");
    const [equipmentItemsErr, equipmentItems, equippedItemInstances] =
      await inventoryService.getEquipmentItems(
        sessionId,
        characterInfo.membershipType,
        characterInfo.membershipId,
        characterInfo.characterId
      );
    if (equipmentItemsErr) {
      return logger.loggedError(`Unable to retrieve equipment items: ${equipmentItemsErr.message}`);
    }

    const equippedItems = groupEquipmentItems(equipmentItems);

    const tableData: string[][] = [];

    const tableHeader = ["Slot", "Item", "Power"];
    if (verbose) {
      tableHeader.push("ID");
    }
    tableData.push(tableHeader);

    for (let bucketNameIndex = 0; bucketNameIndex < EquipmentBuckets.length; bucketNameIndex++) {
      const bucket = EquipmentBuckets[bucketNameIndex];
      const bucketLabel = InventoryBucketLabels[bucket];
      const bucketItems = equippedItems[bucket];

      const equippedItem = bucketItems[0];

      const [equippedItemDefinitionErr, equippedItemDefinition] =
        await manifestDefinitionService.getItemDefinition(equippedItem.itemHash);
      if (equippedItemDefinitionErr) {
        return logger.loggedError(
          `Unable to fetch item definition for ${equippedItem.itemHash}: ${equippedItemDefinitionErr.message}`
        );
      }

      const equippedItemInfo: ItemNameAndPowerLevel = equippedItem
        ? getItemNameAndPowerLevel(
            equippedItemDefinition || null,
            equippedItemInstances[equippedItem.itemInstanceId] || null
          )
        : { label: "UNKNOWN", powerLevel: "N/A" };

      const rowColumns = [
        bucketLabel,
        equippedItemInfo.label,
        equippedItemInfo.powerLevel.padStart(4, " ")
      ];

      if (verbose) {
        rowColumns.push(
          equippedItem ? `${equippedItem.itemHash}:${equippedItem.itemInstanceId}` : "???"
        );
      }

      tableData.push(rowColumns);
    }

    logger.log(makeTable2(tableData, { flexibleColumns: [1] }));
  }
};

export default cmd;
