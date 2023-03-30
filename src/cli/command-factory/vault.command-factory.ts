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
import { DestinyItemComponent } from "~type/bungie-api/destiny/entities/items.types";

type CmdOptions = SessionIdCommandOptions & VerboseCommandOptions & ItemInstanceIdsCommandOptions;

type TransferCommandOptions = {
  toVault: boolean;
};

export const transferCommand = (options: TransferCommandOptions): CommandDefinition => {
  return {
    description: options.toVault ? "Move items into the vault" : "Take items out of the vault",
    options: [sessionIdOption, verboseOption, itemInstanceIdsOption],
    action: async (_, opts, { app, logger }) => {
      const {
        session: sessionId,
        verbose,
        itemInstanceIds: itemInstanceIdsStr
      } = opts as CmdOptions;
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
        let sourceItems: DestinyItemComponent[];

        if (options.toVault) {
          const [inventoryItemsErr, inventoryItems] = await inventoryService.getInventoryItems(
            sessionId,
            characterInfo.membershipType,
            characterInfo.membershipId,
            characterInfo.characterId
          );
          if (inventoryItemsErr) {
            return logger.loggedError(
              `Unable to get inventory items: ${inventoryItemsErr.message}`
            );
          }
          sourceItems = inventoryItems;
        } else {
          const [vaultItemsErr, vaultItems] = await inventoryService.getVaultItems(
            sessionId,
            characterInfo.membershipType,
            characterInfo.membershipId
          );
          if (vaultItemsErr) {
            return logger.loggedError(`Unable to get vault items: ${vaultItemsErr.message}`);
          }
          sourceItems = vaultItems;
        }

        const tableData: string[][] = [];

        const tableHeader = ["Item", "Transferred?"];
        if (verbose) {
          tableHeader.push("Message");
        }
        tableData.push(tableHeader);

        let failedToTransferCount = 0;
        for (
          let itemInstanceIdIndex = 0;
          itemInstanceIdIndex < itemInstanceIds.length;
          itemInstanceIdIndex++
        ) {
          const itemInstanceId = itemInstanceIds[itemInstanceIdIndex];
          const item = sourceItems.find((item) => item.itemInstanceId === itemInstanceId) || null;

          const rowColumns: string[] = [];

          if (item) {
            logger.info(`Fetching item definition for ${item.itemHash} ...`);
            const [itemDefinitionErr, itemDefinition] =
              await manifestDefinitionService.getItemDefinition(item.itemHash);
            if (itemDefinitionErr) {
              return logger.loggedError(`Unable to fetch item definition for ${item.itemHash}`);
            }

            let itemDescription: string;
            if (!itemDefinition) {
              itemDescription = `Missing item definition for hash ${item.itemHash}`;
            } else {
              itemDescription = `${itemDefinition.displayProperties.name} (${itemDefinition.itemTypeAndTierDisplayName})`;
            }

            rowColumns.push(itemDescription);

            logger.info(
              itemInstanceIds.length <= 1
                ? `Transferring item ${
                    options.toVault ? "to" : "from"
                  } vault: ${itemDescription} ...`
                : `Transferring item ${itemInstanceIdIndex + 1} of ${itemInstanceIds.length} ${
                    options.toVault ? "to" : "from"
                  } vault: ${itemDescription} ...`
            );
            const transferFromVaultErr = await (options.toVault
              ? destiny2ActionService.transferItemToVault(
                  sessionId,
                  characterInfo.membershipType,
                  characterInfo.characterId,
                  item.itemHash,
                  item.itemInstanceId
                )
              : destiny2ActionService.transferItemFromVault(
                  sessionId,
                  characterInfo.membershipType,
                  characterInfo.characterId,
                  item.itemHash,
                  item.itemInstanceId
                ));
            if (transferFromVaultErr) {
              failedToTransferCount = failedToTransferCount + 1;
              rowColumns.push("No");
              if (verbose) {
                rowColumns.push(transferFromVaultErr.message);
              }
            } else {
              rowColumns.push("Yes");
              if (verbose) {
                rowColumns.push("");
              }
            }
          } else {
            failedToTransferCount = failedToTransferCount + 1;

            rowColumns.push(itemInstanceId);
            rowColumns.push("No");
            if (verbose) {
              rowColumns.push(`Unable to find item in ${options.toVault ? "inventory" : "vault"}`);
            }
          }

          tableData.push(rowColumns);
        }

        logger.log(makeTable2(tableData, { flexibleColumns: verbose ? [2] : [0] }));

        if (failedToTransferCount > 0) {
          logger.log(`Failed to transfer ${failedToTransferCount} item(s)`);
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
};
