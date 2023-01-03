import { CommandDefinition } from "~src/cli/d2cli.types";
import { fnWithSpinner } from "~src/helper/cli-promise.helper";
import { stringifyTable } from "~src/helper/table.helper";
import { AppModule } from "~src/module/app.module";
import { Destiny2ManifestService } from "~src/service/destiny2-manifest/destiny2-manifest.service";
import { BungieApiDestiny2ManifestLanguage } from "~src/service/destiny2-manifest/destiny2-manifest.types";
import { BungieApiDestiny2ManifestComponent } from "~src/service/destiny2-manifest/destiny2-manifest.types";
import { BungieApiDestiny2InventoryItemDefinitions } from "~src/service/destiny2-manifest/destiny2-manifest.types";
import { LogService } from "~src/service/log/log.service";

import { getSelectedCharacterInfo } from "../../command-helper/current-character.helper";
import { sessionIdOption } from "../../command-option/session-id.option";
import { verboseOption } from "../../command-option/verbose.option";
import { SessionCommandOptions } from "../command.types";
import { getPostmasterItems } from "./get-postmaster-items";

type CmdOptions = SessionCommandOptions & { verbose: boolean };

const cmd: CommandDefinition = {
  description: "List items in Vanguard mailbox",
  options: [sessionIdOption, verboseOption],
  action: async (_, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:postmaster:list");

    const { session: sessionId, verbose } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const destiny2ManifestService =
      AppModule.getDefaultInstance().resolve<Destiny2ManifestService>("Destiny2ManifestService");

    const [characterInfoErr, characterInfo] = await getSelectedCharacterInfo(logger, sessionId);
    if (characterInfoErr) {
      return characterInfoErr;
    }

    const [itemDefinitionErr, itemDefinitions] = await fnWithSpinner(
      "Retrieving inventory item definitions ...",
      () =>
        destiny2ManifestService.getDestiny2ManifestComponent<BungieApiDestiny2InventoryItemDefinitions>(
          BungieApiDestiny2ManifestLanguage.English,
          BungieApiDestiny2ManifestComponent.InventoryItemDefinition
        )
    );
    if (itemDefinitionErr) {
      return logger.loggedError(
        `Unable to retrieve item definitions: ${itemDefinitionErr.message}`
      );
    }

    const [postmasterItemsErr, postmasterItems] = await fnWithSpinner(
      "Retrieving postmaster items ...",
      () =>
        getPostmasterItems(
          sessionId,
          characterInfo.membershipType,
          characterInfo.membershipId,
          characterInfo.characterId
        )
    );
    if (postmasterItemsErr) {
      return logger.loggedError(
        `Unable to retrieve postmaster items: ${postmasterItemsErr.message}`
      );
    }

    const tableData: string[][] = [];

    const basicHeaders = ["#", "Description", "Quantity"];
    if (verbose) {
      tableData.push([...basicHeaders, "Hash", "Instance ID"]);
    } else {
      tableData.push(basicHeaders);
    }

    for (
      let postmasterItemIndex = 0;
      postmasterItemIndex < postmasterItems.length;
      postmasterItemIndex++
    ) {
      const postmasterItem = postmasterItems[postmasterItemIndex];
      const itemDefinition = itemDefinitions[postmasterItem.itemHash] || null;

      if (!itemDefinition) {
        tableData.push([
          `${postmasterItemIndex + 1}`,
          `Missing item definition for hash ${postmasterItem.itemHash}`,
          "x ???"
        ]);
      } else {
        const basicCells = [
          `${postmasterItemIndex + 1}`,
          `${itemDefinition.displayProperties.name} (${itemDefinition.itemTypeAndTierDisplayName})`,
          `x ${postmasterItem.quantity}`
        ];
        if (verbose) {
          tableData.push([
            ...basicCells,
            `${postmasterItem.itemHash}`,
            postmasterItem.itemInstanceId || ""
          ]);
        } else {
          tableData.push(basicCells);
        }
      }
    }

    logger.log(stringifyTable(tableData));
  }
};

export default cmd;
