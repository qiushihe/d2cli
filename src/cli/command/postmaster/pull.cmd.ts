import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { verboseOption } from "~src/cli/command-option/cli.option";
import { VerboseCommandOptions } from "~src/cli/command-option/cli.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { makeTable } from "~src/helper/table.helper";
import { AppModule } from "~src/module/app.module";
import { CharacterSelectionService } from "~src/service/character-selection/character-selection.service";
import { LogService } from "~src/service/log/log.service";
import { ManifestDefinitionService } from "~src/service/manifest-definition/manifest-definition.service";
import { PostmasterService } from "~src/service/postmaster/postmaster.service";
import { DestinyItemComponent } from "~type/bungie-api/destiny/entities/items.types";

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

    const manifestDefinitionService =
      AppModule.getDefaultInstance().resolve<ManifestDefinitionService>(
        "ManifestDefinitionService"
      );

    const destiny2PostmasterService =
      AppModule.getDefaultInstance().resolve<PostmasterService>("PostmasterService");

    const characterSelectionService =
      AppModule.getDefaultInstance().resolve<CharacterSelectionService>(
        "CharacterSelectionService"
      );

    const [characterInfoErr, characterInfo] =
      await characterSelectionService.ensureSelectedCharacter(sessionId);
    if (characterInfoErr) {
      return logger.loggedError(`Unable to character info: ${characterInfoErr.message}`);
    }

    logger.info("Retrieving postmaster items ...");
    const [postmasterItemsErr, postmasterItems] = await destiny2PostmasterService.getItems(
      sessionId,
      characterInfo.membershipType,
      characterInfo.membershipId,
      characterInfo.characterId
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

      logger.info(`Fetching item definition for ${item.itemHash} ...`);
      const [itemDefinitionErr, itemDefinition] = await manifestDefinitionService.getItemDefinition(
        item.itemHash
      );
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

      const itemCells = [`${itemNumber}`, itemDescription];

      logger.info(
        itemsToPull.length <= 1
          ? `Pulling item from postmaster: ${itemDescription} ...`
          : `Pulling item ${itemIndex + 1} of ${
              itemsToPull.length
            } from postmaster: ${itemDescription} ...`
      );
      const pullItemErr = await destiny2PostmasterService.pullItem(
        sessionId,
        characterInfo.membershipType,
        characterInfo.characterId,
        item.itemHash,
        item.itemInstanceId || null
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

    logger.log(makeTable(tableData));

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
