import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { verboseOption } from "~src/cli/command-option/cli.option";
import { VerboseCommandOptions } from "~src/cli/command-option/cli.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { getSelectedCharacterInfo } from "~src/helper/current-character.helper";
import { InventoryBucketLabels } from "~src/helper/inventory-bucket.helper";
import { EquipmentBuckets } from "~src/helper/inventory-bucket.helper";
import { groupEquipmentItems } from "~src/helper/inventory-bucket.helper";
import { ItemNameAndPowerLevel } from "~src/helper/item.helper";
import { getItemNameAndPowerLevel } from "~src/helper/item.helper";
import { stringifyTable } from "~src/helper/table.helper";
import { AppModule } from "~src/module/app.module";
import { Destiny2InventoryService } from "~src/service/destiny2-inventory/destiny2-inventory.service";
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

    const destiny2InventoryService =
      AppModule.getDefaultInstance().resolve<Destiny2InventoryService>("Destiny2InventoryService");

    const [characterInfoErr, characterInfo] = await getSelectedCharacterInfo(logger, sessionId);
    if (characterInfoErr) {
      return logger.loggedError(`Unable to get character info: ${characterInfoErr.message}`);
    }

    logger.info("Retrieving inventory items ...");
    const [inventoryItemsErr, inventoryItems, inventoryItemInstances] =
      await destiny2InventoryService.getInventoryItems(
        sessionId,
        characterInfo.membershipType,
        characterInfo.membershipId,
        characterInfo.characterId,
        {
          includeItemInstances: verbose
        }
      );
    if (inventoryItemsErr) {
      return logger.loggedError(`Unable to retrieve inventory items: ${inventoryItemsErr.message}`);
    }

    const unequippedItems = groupEquipmentItems(inventoryItems);

    const tableData: string[][] = [];

    const basicHeaders = ["Slot", "Item", "ID"];
    if (verbose) {
      tableData.push([...basicHeaders, "Power Level"]);
    } else {
      tableData.push(basicHeaders);
    }

    for (let bucketNameIndex = 0; bucketNameIndex < EquipmentBuckets.length; bucketNameIndex++) {
      const bucket = EquipmentBuckets[bucketNameIndex];
      const bucketLabel = InventoryBucketLabels[bucket];
      const bucketItems = unequippedItems[bucket];

      const unEquippedItemLabels: string[] = [];
      const unEquippedItemIds: string[] = [];
      const unEquippedItemPowerLevels: string[] = [];

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

        unEquippedItemLabels.push(unEquippedItemInfo.label);
        unEquippedItemIds.push(`${unEquippedItem.itemHash}:${unEquippedItem.itemInstanceId}`);
        unEquippedItemPowerLevels.push(unEquippedItemInfo.powerLevel);
      }

      if (verbose) {
        tableData.push([
          bucketLabel,
          unEquippedItemLabels.join("\n"),
          unEquippedItemIds.join("\n"),
          unEquippedItemPowerLevels.map((lvl) => lvl.padStart(4, " ")).join("\n")
        ]);
      } else {
        tableData.push([
          bucketLabel,
          unEquippedItemLabels.join("\n"),
          unEquippedItemIds.join("\n")
        ]);
      }
    }

    logger.log(stringifyTable(tableData));
  }
};

export default cmd;
