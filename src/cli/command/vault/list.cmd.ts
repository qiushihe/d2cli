import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { verboseOption } from "~src/cli/command-option/cli.option";
import { VerboseCommandOptions } from "~src/cli/command-option/cli.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { getSelectedCharacterInfo } from "~src/helper/current-character.helper";
import { ItemNameAndPowerLevel } from "~src/helper/item.helper";
import { getItemNameAndPowerLevel } from "~src/helper/item.helper";
import { stringifyTable } from "~src/helper/table.helper";
import { AppModule } from "~src/module/app.module";
import { Destiny2InventoryService } from "~src/service/destiny2-inventory/destiny2-inventory.service";
import { LogService } from "~src/service/log/log.service";
import { ManifestDefinitionService } from "~src/service/manifest-definition/manifest-definition.service";

type CmdOptions = SessionIdCommandOptions & VerboseCommandOptions;

const cmd: CommandDefinition = {
  description: "List items in vault",
  options: [sessionIdOption, verboseOption],
  action: async (_, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:vault:list");

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

    logger.info("Retrieving vault items ...");
    const [vaultItemsErr, vaultItems, vaultItemInstances] =
      await destiny2InventoryService.getVaultItems(
        sessionId,
        characterInfo.membershipType,
        characterInfo.membershipId,
        {
          includeItemInstances: verbose
        }
      );
    if (vaultItemsErr) {
      return logger.loggedError(
        `Unable to retrieve profile inventory items: ${vaultItemsErr.message}`
      );
    }

    const tableData: string[][] = [];

    const basicHeaders = ["Item", "Hash", "Instance ID"];
    if (verbose) {
      tableData.push([...basicHeaders, "Power Level"]);
    } else {
      tableData.push(basicHeaders);
    }

    for (let vaultItemIndex = 0; vaultItemIndex < vaultItems.length; vaultItemIndex++) {
      const vaultItem = vaultItems[vaultItemIndex];

      logger.info(`Fetching item definition for ${vaultItem.itemHash} ...`);
      const [vaultItemDefinitionErr, vaultItemDefinition] =
        await manifestDefinitionService.getItemDefinition(vaultItem.itemHash);
      if (vaultItemDefinitionErr) {
        return logger.loggedError(
          `Unable to fetch item definition for ${vaultItem.itemHash}: ${vaultItemDefinitionErr.message}`
        );
      }

      const vaultItemInfo: ItemNameAndPowerLevel = getItemNameAndPowerLevel(
        vaultItemDefinition || null,
        vaultItemInstances[vaultItem.itemInstanceId] || null
      );

      if (verbose) {
        tableData.push([
          vaultItemInfo.label,
          `${vaultItem.itemHash}`,
          vaultItem.itemInstanceId,
          vaultItemInfo.powerLevel
        ]);
      } else {
        tableData.push([vaultItemInfo.label, `${vaultItem.itemHash}`, vaultItem.itemInstanceId]);
      }
    }

    logger.log(stringifyTable(tableData));
  }
};

export default cmd;
