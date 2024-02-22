import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { verboseOption } from "~src/cli/command-option/cli.option";
import { VerboseCommandOptions } from "~src/cli/command-option/cli.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { ItemNameAndPowerLevel } from "~src/helper/item.helper";
import { getItemNameAndPowerLevel } from "~src/helper/item.helper";
import { makeTable2 } from "~src/helper/table.helper";
import { CharacterSelectionService } from "~src/service/character-selection/character-selection.service";
import { InventoryService } from "~src/service/inventory/inventory.service";
import { ManifestDefinitionService } from "~src/service/manifest-definition/manifest-definition.service";

type CmdOptions = SessionIdCommandOptions & VerboseCommandOptions;

const cmd: CommandDefinition = {
  description: "List items in vault",
  options: [sessionIdOption, verboseOption],
  action: async (_, opts, { app, logger }) => {
    const { session: sessionId, verbose } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const manifestDefinitionService = app.resolve(ManifestDefinitionService);

    const inventoryService = app.resolve(InventoryService);

    const characterSelectionService = app.resolve(CharacterSelectionService);

    const [characterInfoErr, characterInfo] =
      await characterSelectionService.ensureSelectedCharacter(sessionId);
    if (characterInfoErr) {
      return logger.loggedError(`Unable to get character info: ${characterInfoErr.message}`);
    }

    logger.info("Retrieving vault items ...");
    const [vaultItemsErr, vaultItems] = await inventoryService.getVaultItems(
      sessionId,
      characterInfo.membershipType,
      characterInfo.membershipId
    );
    if (vaultItemsErr) {
      return logger.loggedError(`Unable to retrieve vault items: ${vaultItemsErr.message}`);
    }

    const tableData: string[][] = [];

    const tableHeader = ["Item", "Power"];
    if (verbose) {
      tableHeader.push("ID");
    }
    tableData.push(tableHeader);

    for (let vaultItemIndex = 0; vaultItemIndex < vaultItems.components.length; vaultItemIndex++) {
      const vaultItem = vaultItems.components[vaultItemIndex];

      const [vaultItemDefinitionErr, vaultItemDefinition] =
        await manifestDefinitionService.getItemDefinition(vaultItem.itemHash);
      if (vaultItemDefinitionErr) {
        return logger.loggedError(
          `Unable to fetch item definition for ${vaultItem.itemHash}: ${vaultItemDefinitionErr.message}`
        );
      }

      const vaultItemInfo: ItemNameAndPowerLevel = getItemNameAndPowerLevel(
        vaultItemDefinition || null,
        vaultItems.instances[vaultItem.itemInstanceId] || null
      );

      const rowColumns = [vaultItemInfo.label, vaultItemInfo.powerLevel];

      if (verbose) {
        rowColumns.push(`${vaultItem.itemHash}:${vaultItem.itemInstanceId}`);
      }

      tableData.push(rowColumns);
    }

    logger.log(makeTable2(tableData, { flexibleColumns: [0] }));
  }
};

export default cmd;
