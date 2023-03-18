import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { verboseOption } from "~src/cli/command-option/cli.option";
import { VerboseCommandOptions } from "~src/cli/command-option/cli.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { fnWithSpinner } from "~src/helper/cli-promise.helper";
import { getSelectedCharacterInfo } from "~src/helper/current-character.helper";
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
  description: "List items in vault",
  options: [sessionIdOption, verboseOption],
  action: async (_, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:inventory:list:vault");

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

    const [vaultItemsErr, vaultItems, vaultItemInstances] = await fnWithSpinner(
      "Retrieving vault items ...",
      () =>
        destiny2InventoryService.getVaultItems(
          sessionId,
          characterInfo.membershipType,
          characterInfo.membershipId,
          {
            includeItemInstances: verbose
          }
        )
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

      const vaultItemInfo: ItemInfo = getItemNameAndPowerLevel(
        itemDefinitions[vaultItem.itemHash] || null,
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
