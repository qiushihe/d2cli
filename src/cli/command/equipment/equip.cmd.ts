import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { verboseOption } from "~src/cli/command-option/cli.option";
import { VerboseCommandOptions } from "~src/cli/command-option/cli.option";
import { itemInstanceIdsOption } from "~src/cli/command-option/item.option";
import { ItemInstanceIdsCommandOptions } from "~src/cli/command-option/item.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { makeTable2 } from "~src/helper/table.helper";
import { CharacterSelectionService } from "~src/service/character-selection/character-selection.service";
import { Destiny2ActionService } from "~src/service/destiny2-action/destiny2-action.service";
import { InventoryService } from "~src/service/inventory/inventory.service";
import { ManifestDefinitionService } from "~src/service/manifest-definition/manifest-definition.service";

type CmdOptions = SessionIdCommandOptions & VerboseCommandOptions & ItemInstanceIdsCommandOptions;

const cmd: CommandDefinition = {
  description: "Equip an item",
  options: [sessionIdOption, verboseOption, itemInstanceIdsOption],
  action: async (_, opts, { app, logger }) => {
    const { session: sessionId, verbose, itemInstanceIds: itemInstanceIdsStr } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const manifestDefinitionService = app.resolve(ManifestDefinitionService);

    const characterSelectionService = app.resolve(CharacterSelectionService);

    const inventoryService = app.resolve(InventoryService);

    const destiny2ActionService = app.resolve(Destiny2ActionService);

    const [characterInfoErr, characterInfo] =
      await characterSelectionService.ensureSelectedCharacter(sessionId);
    if (characterInfoErr) {
      return logger.loggedError(`Unable to get character info: ${characterInfoErr.message}`);
    }

    const itemInstanceIds = (itemInstanceIdsStr || "").trim().split(",");

    if (itemInstanceIds.length > 0) {
      logger.info("Fetching inventory items");
      const [inventoryItemsErr, inventoryItems] = await inventoryService.getInventoryItems(
        sessionId,
        characterInfo.membershipType,
        characterInfo.membershipId,
        characterInfo.characterId
      );
      if (inventoryItemsErr) {
        return logger.loggedError(`Unable to fetch inventory items: ${inventoryItemsErr.message}`);
      }

      const tableData: string[][] = [];

      const tableHeader = ["Item", "Equipped?"];
      if (verbose) {
        tableHeader.push("Message");
      }
      tableData.push(tableHeader);

      let failedToEquipCount = 0;
      for (
        let itemInstanceIdIndex = 0;
        itemInstanceIdIndex < itemInstanceIds.length;
        itemInstanceIdIndex++
      ) {
        const itemInstanceId = itemInstanceIds[itemInstanceIdIndex];
        const item = inventoryItems.find((item) => item.itemInstanceId === itemInstanceId) || null;

        const rowColumns: string[] = [];

        if (item) {
          const [itemDefinitionErr, itemDefinition] =
            await manifestDefinitionService.getItemDefinition(item.itemHash);
          if (itemDefinitionErr) {
            return logger.loggedError(
              `Unable to fetch item definition for ${item.itemHash}: ${itemDefinitionErr.message}`
            );
          }

          let itemDescription: string;
          if (!itemDefinition) {
            itemDescription = `Missing item definition for hash ${item.itemHash}`;
          } else {
            itemDescription = `${itemDefinition.displayProperties.name} (${itemDefinition.itemTypeAndTierDisplayName})`;
          }

          rowColumns.push(itemDescription);

          logger.info(`Equipping item: ${itemDescription} ...`);
          const equipErr = await destiny2ActionService.equipItem(
            sessionId,
            characterInfo.membershipType,
            characterInfo.characterId,
            item.itemInstanceId
          );
          if (equipErr) {
            failedToEquipCount = failedToEquipCount + 1;
            rowColumns.push("No");
            if (verbose) {
              rowColumns.push(equipErr.message);
            }
          } else {
            rowColumns.push("Yes");
            if (verbose) {
              rowColumns.push("");
            }
          }
        } else {
          failedToEquipCount = failedToEquipCount + 1;
          rowColumns.push(itemInstanceId);
          rowColumns.push("No");
          if (verbose) {
            rowColumns.push("Unable to find item in inventory");
          }
        }

        tableData.push(rowColumns);
      }

      logger.log(makeTable2(tableData, { flexibleColumns: verbose ? [2] : [0] }));

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
