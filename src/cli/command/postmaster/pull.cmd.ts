import { CommandDefinition } from "~src/cli/d2qdb.types";
import { fnWithSpinner } from "~src/helper/cli-promise.helper";
import { bgGreen, bgRed } from "~src/helper/colour.helper";
import { stringifyTable } from "~src/helper/table.helper";
import { AppModule } from "~src/module/app.module";
import { Destiny2InventoryService } from "~src/service/destiny2-inventory/destiny2-inventory.service";
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
  description: "Pull item(s) from Vanguard mailbox",
  options: [sessionIdOption, verboseOption],
  action: async (_, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:postmaster:pull");

    const { session: sessionId, verbose } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const destiny2ManifestService =
      AppModule.getDefaultInstance().resolve<Destiny2ManifestService>("Destiny2ManifestService");

    const destiny2InventoryService =
      AppModule.getDefaultInstance().resolve<Destiny2InventoryService>("Destiny2InventoryService");

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

    const basicHeaders = ["#", "Description", "Pulled?"];
    if (verbose) {
      tableData.push([...basicHeaders, "Message"]);
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

      let itemDescription: string;
      if (!itemDefinition) {
        itemDescription = `Missing item definition for hash ${postmasterItem.itemHash}`;
      } else {
        itemDescription = `${itemDefinition.displayProperties.name} (${itemDefinition.itemTypeAndTierDisplayName})`;
      }

      const itemCells = [`${postmasterItemIndex + 1}`, itemDescription];

      const pullItemErr = await fnWithSpinner(
        `Pulling item #${postmasterItemIndex + 1} from postmaster ...`,
        () =>
          destiny2InventoryService.pullItemFromPostmaster(
            sessionId,
            characterInfo.membershipType,
            characterInfo.characterId,
            postmasterItem.itemHash,
            postmasterItem.itemInstanceId || null
          )
      );
      if (pullItemErr) {
        if (verbose) {
          tableData.push([...itemCells, bgRed("No"), pullItemErr.message]);
        } else {
          tableData.push([...itemCells, bgRed("No")]);
        }
      } else {
        if (verbose) {
          tableData.push([...itemCells, bgGreen("Yes"), ""]);
        } else {
          tableData.push([...itemCells, bgGreen("Yes")]);
        }
      }
    }

    logger.log(stringifyTable(tableData));
  }
};

export default cmd;
