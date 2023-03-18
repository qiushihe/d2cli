import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { verboseOption } from "~src/cli/command-option/cli.option";
import { VerboseCommandOptions } from "~src/cli/command-option/cli.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { fnWithSpinner } from "~src/helper/cli-promise.helper";
import { getSelectedCharacterInfo } from "~src/helper/current-character.helper";
import { BucketLabels } from "~src/helper/inventory-bucket.helper";
import { BucketOrder } from "~src/helper/inventory-bucket.helper";
import { groupInventoryItems } from "~src/helper/inventory-bucket.helper";
import { CharacterInventoryBuckets } from "~src/helper/inventory-bucket.helper";
import { ItemInfo } from "~src/helper/item.helper";
import { getItemNameAndPowerLevel } from "~src/helper/item.helper";
import { stringifyTable } from "~src/helper/table.helper";
import { AppModule } from "~src/module/app.module";
import { Destiny2InventoryService } from "~src/service/destiny2-inventory/destiny2-inventory.service";
import { Destiny2ManifestService } from "~src/service/destiny2-manifest/destiny2-manifest.service";
import { LogService } from "~src/service/log/log.service";
import { Destiny2ManifestLanguage } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestComponent } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestInventoryItemDefinitions } from "~type/bungie-asset/destiny2.types";

type CmdOptions = SessionIdCommandOptions & VerboseCommandOptions;

const cmd: CommandDefinition = {
  description: "List currently equipped items in character inventory",
  options: [sessionIdOption, verboseOption],
  action: async (_, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:inventory:list:equipped");

    const { session: sessionId, verbose } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const destiny2ManifestService =
      AppModule.getDefaultInstance().resolve<Destiny2ManifestService>("Destiny2ManifestService");

    const destiny2InventoryService =
      AppModule.getDefaultInstance().resolve<Destiny2InventoryService>("Destiny2InventoryService");

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

    const [equipmentItemsErr, equipmentItems, equippedItemInstances] = await fnWithSpinner(
      "Retrieving equipment items ...",
      () =>
        destiny2InventoryService.getEquipmentItems(
          sessionId,
          characterInfo.membershipType,
          characterInfo.membershipId,
          characterInfo.characterId,
          {
            includeItemInstances: verbose
          }
        )
    );
    if (equipmentItemsErr) {
      return logger.loggedError(`Unable to retrieve equipment items: ${equipmentItemsErr.message}`);
    }

    const equippedItems = groupInventoryItems(equipmentItems);

    const tableData: string[][] = [];

    const basicHeaders = ["Slot", "Item", "Hash", "Instance ID"];
    if (verbose) {
      tableData.push([...basicHeaders, "Power Level"]);
    } else {
      tableData.push(basicHeaders);
    }

    const buckets = Object.values(CharacterInventoryBuckets).sort(
      (a, b) => BucketOrder.indexOf(a) - BucketOrder.indexOf(b)
    );

    for (let bucketNameIndex = 0; bucketNameIndex < buckets.length; bucketNameIndex++) {
      const bucket = buckets[bucketNameIndex];
      const bucketLabel = BucketLabels[bucket];
      const bucketItems = equippedItems[bucket];

      const equippedItem = bucketItems[0];
      const equippedItemInfo: ItemInfo = equippedItem
        ? getItemNameAndPowerLevel(
            itemDefinitions[equippedItem.itemHash] || null,
            equippedItemInstances[equippedItem.itemInstanceId] || null
          )
        : { label: "UNKNOWN", powerLevel: "N/A" };

      if (verbose) {
        tableData.push([
          bucketLabel,
          equippedItemInfo.label,
          equippedItem ? `${equippedItem.itemHash}` : "N/A",
          equippedItem ? equippedItem.itemInstanceId : "N/A",
          equippedItemInfo.powerLevel.padStart(4, " ")
        ]);
      } else {
        tableData.push([
          bucketLabel,
          equippedItemInfo.label,
          equippedItem ? `${equippedItem.itemHash}` : "N/A",
          equippedItem ? equippedItem.itemInstanceId : "N/A"
        ]);
      }
    }

    logger.log(stringifyTable(tableData));
  }
};

export default cmd;
