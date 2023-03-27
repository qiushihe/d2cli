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
import { AppModule } from "~src/module/app.module";
import { CharacterSelectionService } from "~src/service/character-selection/character-selection.service";
import { InventoryService } from "~src/service/inventory/inventory.service";
import { LogService } from "~src/service/log/log.service";
import { ManifestDefinitionService } from "~src/service/manifest-definition/manifest-definition.service";

type CmdOptions = SessionIdCommandOptions & VerboseCommandOptions;

const cmd: CommandDefinition = {
  description: "List currently unequipped items in character inventory",
  options: [sessionIdOption, verboseOption],
  action: async (_, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:equipment:unequipped");

    const { session: sessionId, verbose } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const manifestDefinitionService =
      AppModule.getDefaultInstance().resolve<ManifestDefinitionService>(
        "ManifestDefinitionService"
      );

    const characterSelectionService =
      AppModule.getDefaultInstance().resolve<CharacterSelectionService>(
        "CharacterSelectionService"
      );

    const inventoryService =
      AppModule.getDefaultInstance().resolve<InventoryService>("InventoryService");

    const [characterInfoErr, characterInfo] =
      await characterSelectionService.ensureSelectedCharacter(sessionId);
    if (characterInfoErr) {
      return logger.loggedError(`Unable to get character info: ${characterInfoErr.message}`);
    }

    logger.info("Retrieving inventory items ...");
    const [inventoryItemsErr, inventoryItems, inventoryItemInstances] =
      await inventoryService.getInventoryItems(
        sessionId,
        characterInfo.membershipType,
        characterInfo.membershipId,
        characterInfo.characterId
      );
    if (inventoryItemsErr) {
      return logger.loggedError(`Unable to retrieve inventory items: ${inventoryItemsErr.message}`);
    }

    const unequippedItems = groupEquipmentItems(inventoryItems);

    const tableData: string[][] = [];

    const tableHeader = ["Slot", "Item", "Power"];
    if (verbose) {
      tableHeader.push("ID");
    }
    tableData.push(tableHeader);

    for (let bucketNameIndex = 0; bucketNameIndex < EquipmentBuckets.length; bucketNameIndex++) {
      const bucket = EquipmentBuckets[bucketNameIndex];
      const bucketLabel = InventoryBucketLabels[bucket];
      const bucketItems = unequippedItems[bucket];

      for (
        let unEquippedItemIndex = 0;
        unEquippedItemIndex < bucketItems.length;
        unEquippedItemIndex++
      ) {
        const unEquippedItem = bucketItems[unEquippedItemIndex];

        logger.info(`Fetching item definition for ${unEquippedItem.itemHash} ...`);
        const [unEquippedItemDefinitionErr, unEquippedItemDefinition] =
          await manifestDefinitionService.getItemDefinition(unEquippedItem.itemHash);
        if (unEquippedItemDefinitionErr) {
          return logger.loggedError(
            `Unable to fetch item definition for ${unEquippedItem.itemHash}: ${unEquippedItemDefinitionErr.message}`
          );
        }

        const unEquippedItemInfo: ItemNameAndPowerLevel = getItemNameAndPowerLevel(
          unEquippedItemDefinition || null,
          inventoryItemInstances[unEquippedItem.itemInstanceId] || null
        );

        const rowColumns = [
          unEquippedItemIndex === 0 ? bucketLabel : "",
          unEquippedItemInfo.label,
          unEquippedItemInfo.powerLevel
        ];

        if (verbose) {
          rowColumns.push(`${unEquippedItem.itemHash}:${unEquippedItem.itemInstanceId}`);
        }

        tableData.push(rowColumns);
      }
    }

    logger.log(makeTable2(tableData, { flexibleColumns: [1] }));
  }
};

export default cmd;
