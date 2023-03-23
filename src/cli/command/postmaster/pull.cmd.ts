import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { verboseOption } from "~src/cli/command-option/cli.option";
import { VerboseCommandOptions } from "~src/cli/command-option/cli.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { fnWithSpinner } from "~src/helper/cli-promise.helper";
import { getSelectedCharacterInfo } from "~src/helper/current-character.helper";
import { getPostmasterItems } from "~src/helper/postmaster.helper";
import { stringifyTable } from "~src/helper/table.helper";
import { AppModule } from "~src/module/app.module";
import { Destiny2ManifestService } from "~src/service/destiny2-manifest/destiny2-manifest.service";
import { Destiny2PostmasterService } from "~src/service/destiny2-postmaster/destiny2-postmaster.service";
import { LogService } from "~src/service/log/log.service";
import { DestinyItemComponent } from "~type/bungie-api/destiny/entities/items.types";
import { Destiny2ManifestLanguage } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestComponent } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestInventoryItemDefinitions } from "~type/bungie-asset/destiny2.types";

type CmdOptions = SessionIdCommandOptions & VerboseCommandOptions & { itemNumber: string };

const cmd: CommandDefinition = {
  description: "Pull item(s) from Vanguard mailbox",
  options: [
    sessionIdOption,
    verboseOption,
    {
      flags: ["n", "item-number <num>"],
      description: "Specific item number to pull"
    }
  ],
  action: async (_, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:postmaster:pull");

    const { session: sessionId, verbose, itemNumber: itemNumberStr } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const itemNumberToPull = parseInt(itemNumberStr);
    if (!isNaN(itemNumberToPull)) {
      logger.debug(`Item number to pull: ${itemNumberToPull}`);
    } else {
      logger.debug(`Should pull all items`);
    }

    const destiny2ManifestService =
      AppModule.getDefaultInstance().resolve<Destiny2ManifestService>("Destiny2ManifestService");

    const destiny2PostmasterService =
      AppModule.getDefaultInstance().resolve<Destiny2PostmasterService>(
        "Destiny2PostmasterService"
      );

    const [characterInfoErr, characterInfo] = await getSelectedCharacterInfo(logger, sessionId);
    if (characterInfoErr) {
      return logger.loggedError(`Unable to character info: ${characterInfoErr.message}`);
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

    let itemsToPull: { itemNumber: number; item: DestinyItemComponent }[];
    if (!isNaN(itemNumberToPull)) {
      if (itemNumberToPull <= 0 || itemNumberToPull > postmasterItems.length) {
        return logger.loggedError(`Item number out of range: ${itemNumberToPull}`);
      } else {
        itemsToPull = [
          { itemNumber: itemNumberToPull, item: postmasterItems[itemNumberToPull - 1] }
        ];
      }
    } else {
      itemsToPull = postmasterItems.map((item, index) => ({ itemNumber: index + 1, item }));
    }

    const tableData: string[][] = [];

    const basicHeaders = ["#", "Description", "Pulled?"];
    if (verbose) {
      tableData.push([...basicHeaders, "Message"]);
    } else {
      tableData.push(basicHeaders);
    }

    let failedToPullCount = 0;
    for (let itemIndex = 0; itemIndex < itemsToPull.length; itemIndex++) {
      const { itemNumber, item } = itemsToPull[itemIndex];
      const itemDefinition = itemDefinitions[item.itemHash] || null;

      let itemDescription: string;
      if (!itemDefinition) {
        itemDescription = `Missing item definition for hash ${item.itemHash}`;
      } else {
        itemDescription = `${itemDefinition.displayProperties.name} (${itemDefinition.itemTypeAndTierDisplayName})`;
      }

      const itemCells = [`${itemNumber}`, itemDescription];

      const pullItemErr = await fnWithSpinner(
        itemsToPull.length <= 1
          ? `Pulling item from postmaster: ${itemDescription} ...`
          : `Pulling item ${itemIndex + 1} of ${
              itemsToPull.length
            } from postmaster: ${itemDescription} ...`,
        () =>
          destiny2PostmasterService.pullItem(
            sessionId,
            characterInfo.membershipType,
            characterInfo.characterId,
            item.itemHash,
            item.itemInstanceId || null
          )
      );
      if (pullItemErr) {
        failedToPullCount = failedToPullCount + 1;
        if (verbose) {
          tableData.push([...itemCells, "No", pullItemErr.message]);
        } else {
          tableData.push([...itemCells, "No"]);
        }
      } else {
        if (verbose) {
          tableData.push([...itemCells, "Yes", ""]);
        } else {
          tableData.push([...itemCells, "Yes"]);
        }
      }
    }

    logger.log(stringifyTable(tableData));

    if (failedToPullCount > 0) {
      logger.log(`Failed to pull ${failedToPullCount} item(s)`);
      if (!verbose) {
        logger.log(
          `Re-run this command with the "--verbose" (or "-v") option to view the error message(s)`
        );
      }
    }
  }
};

export default cmd;
