import chalk from "chalk";

import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { verboseOption } from "~src/cli/command-option/cli.option";
import { VerboseCommandOptions } from "~src/cli/command-option/cli.option";
import { itemsOption } from "~src/cli/command-option/item.option";
import { ItemsCommandOptions } from "~src/cli/command-option/item.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { fnWithSpinner } from "~src/helper/cli-promise.helper";
import { getSelectedCharacterInfo } from "~src/helper/current-character.helper";
import { stringifyTable } from "~src/helper/table.helper";
import { AppModule } from "~src/module/app.module";
import { Destiny2InventoryService } from "~src/service/destiny2-inventory/destiny2-inventory.service";
import { Destiny2InventoryEquipmentService } from "~src/service/destiny2-inventory-equipment/destiny2-inventory-equipment.service";
import { Destiny2ManifestService } from "~src/service/destiny2-manifest/destiny2-manifest.service";
import { LogService } from "~src/service/log/log.service";
import { Destiny2ManifestLanguage } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestComponent } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestInventoryItemDefinitions } from "~type/bungie-asset/destiny2.types";

type CmdOptions = SessionIdCommandOptions & VerboseCommandOptions & ItemsCommandOptions;

const cmd: CommandDefinition = {
  description: "Equip an item",
  options: [sessionIdOption, verboseOption, itemsOption],
  action: async (_, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:equipment:equip");

    const { session: sessionId, verbose, itemInstanceIds: itemInstanceIdsStr } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const destiny2ManifestService =
      AppModule.getDefaultInstance().resolve<Destiny2ManifestService>("Destiny2ManifestService");

    const destiny2InventoryService =
      AppModule.getDefaultInstance().resolve<Destiny2InventoryService>("Destiny2InventoryService");

    const destiny2InventoryEquipmentService =
      AppModule.getDefaultInstance().resolve<Destiny2InventoryEquipmentService>(
        "Destiny2InventoryEquipmentService"
      );

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

    const itemInstanceIds = (itemInstanceIdsStr || "").trim().split(",");

    if (itemInstanceIds.length > 0) {
      const [inventoryItemsErr, inventoryItems] = await fnWithSpinner(
        "Fetching inventory items",
        () =>
          destiny2InventoryService.getInventoryItems(
            sessionId,
            characterInfo.membershipType,
            characterInfo.membershipId,
            characterInfo.characterId
          )
      );
      if (inventoryItemsErr) {
        return logger.loggedError(`Unable to fetch inventory items: ${inventoryItemsErr.message}`);
      }

      const tableData: string[][] = [];

      const basicHeaders = ["Item", "Equipped?"];
      if (verbose) {
        tableData.push([...basicHeaders, "Message"]);
      } else {
        tableData.push(basicHeaders);
      }

      let failedToEquipCount = 0;
      for (
        let itemInstanceIdIndex = 0;
        itemInstanceIdIndex < itemInstanceIds.length;
        itemInstanceIdIndex++
      ) {
        const itemInstanceId = itemInstanceIds[itemInstanceIdIndex];
        const item = inventoryItems.find((item) => item.itemInstanceId === itemInstanceId) || null;

        if (item) {
          const itemDefinition = itemDefinitions[item.itemHash] || null;

          let itemDescription: string;
          if (!itemDefinition) {
            itemDescription = `Missing item definition for hash ${item.itemHash}`;
          } else {
            itemDescription = `${itemDefinition.displayProperties.name} (${itemDefinition.itemTypeAndTierDisplayName})`;
          }

          const itemCells = [itemDescription];

          const equipErr = await fnWithSpinner(`Equipping item: ${itemDescription} ...`, () =>
            destiny2InventoryEquipmentService.equip(
              sessionId,
              characterInfo.membershipType,
              characterInfo.characterId,
              item.itemInstanceId
            )
          );
          if (equipErr) {
            failedToEquipCount = failedToEquipCount + 1;
            if (verbose) {
              tableData.push([...itemCells, chalk.bgRed("No"), equipErr.message]);
            } else {
              tableData.push([...itemCells, chalk.bgRed("No")]);
            }
          } else {
            if (verbose) {
              tableData.push([...itemCells, chalk.bgGreen("Yes"), ""]);
            } else {
              tableData.push([...itemCells, chalk.bgGreen("Yes")]);
            }
          }
        } else {
          failedToEquipCount = failedToEquipCount + 1;
          if (verbose) {
            tableData.push([itemInstanceId, chalk.bgRed("No"), "Unable to find item in inventory"]);
          } else {
            tableData.push([itemInstanceId, chalk.bgRed("No")]);
          }
        }
      }

      logger.log(stringifyTable(tableData));

      if (failedToEquipCount > 0) {
        logger.log(`Failed to equip ${failedToEquipCount} item(s)`);
        if (!verbose) {
          logger.log(
            `Re-run this command with the "--verbose" (or "-v") option to view the error message(s)`
          );
        }
      }
    } else {
      logger.log("No item instance ID(s) specified!");
    }
  }
};

export default cmd;
