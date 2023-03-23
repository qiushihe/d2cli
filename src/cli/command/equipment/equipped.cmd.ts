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
import { ItemDefinitionService } from "~src/service/item-definition/item-definition.service";
import { LogService } from "~src/service/log/log.service";

type CmdOptions = SessionIdCommandOptions & VerboseCommandOptions;

const cmd: CommandDefinition = {
  description: "List currently equipped items in character inventory",
  options: [sessionIdOption, verboseOption],
  action: async (_, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:equipment:equipped");

    const { session: sessionId, verbose } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const itemDefinitionService =
      AppModule.getDefaultInstance().resolve<ItemDefinitionService>("ItemDefinitionService");

    const destiny2InventoryService =
      AppModule.getDefaultInstance().resolve<Destiny2InventoryService>("Destiny2InventoryService");

    const [characterInfoErr, characterInfo] = await getSelectedCharacterInfo(logger, sessionId);
    if (characterInfoErr) {
      return logger.loggedError(`Unable to get character info: ${characterInfoErr.message}`);
    }

    logger.info("Retrieving equipment items ...");
    const [equipmentItemsErr, equipmentItems, equippedItemInstances] =
      await destiny2InventoryService.getEquipmentItems(
        sessionId,
        characterInfo.membershipType,
        characterInfo.membershipId,
        characterInfo.characterId,
        {
          includeItemInstances: verbose
        }
      );
    if (equipmentItemsErr) {
      return logger.loggedError(`Unable to retrieve equipment items: ${equipmentItemsErr.message}`);
    }

    const equippedItems = groupEquipmentItems(equipmentItems);

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
      const bucketItems = equippedItems[bucket];

      const equippedItem = bucketItems[0];

      logger.info(`Fetching item definition for ${equippedItem.itemHash} ...`);
      const [equippedItemDefinitionErr, equippedItemDefinition] =
        await itemDefinitionService.getItemDefinition(equippedItem.itemHash);
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

      if (verbose) {
        tableData.push([
          bucketLabel,
          equippedItemInfo.label,
          equippedItem ? `${equippedItem.itemHash}:${equippedItem.itemInstanceId}` : "N/A",
          equippedItemInfo.powerLevel.padStart(4, " ")
        ]);
      } else {
        tableData.push([
          bucketLabel,
          equippedItemInfo.label,
          equippedItem ? `${equippedItem.itemHash}:${equippedItem.itemInstanceId}` : "N/A"
        ]);
      }
    }

    logger.log(stringifyTable(tableData));
  }
};

export default cmd;
