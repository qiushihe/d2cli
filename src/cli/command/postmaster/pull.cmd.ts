import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { verboseOption } from "~src/cli/command-option/cli.option";
import { VerboseCommandOptions } from "~src/cli/command-option/cli.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { makeTable2 } from "~src/helper/table.helper";
import { CharacterSelectionService } from "~src/service/character-selection/character-selection.service";
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
  action: async (_, opts, { app, logger }) => {
    const { session: sessionId, verbose, itemNumber: itemNumberStr } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const itemNumberToPull = parseInt(itemNumberStr);
    if (!isNaN(itemNumberToPull)) {
      logger.debug(`Item number to pull: ${itemNumberToPull}`);
    } else {
      logger.debug(`Should pull all items`);
    }

    const manifestDefinitionService = app.resolve(ManifestDefinitionService);

    const destiny2PostmasterService = app.resolve(PostmasterService);

    const characterSelectionService = app.resolve(CharacterSelectionService);

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

    const tableHeader = ["#", "Description", "Pulled?"];
    if (verbose) {
      tableHeader.push("Message");
    }
    tableData.push(tableHeader);

    let failedToPullCount = 0;
    for (let itemIndex = 0; itemIndex < itemsToPull.length; itemIndex++) {
      const { itemNumber, item } = itemsToPull[itemIndex];

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

      const rowColumns = [`${itemNumber}`, itemDescription];

      logger.info(
        itemsToPull.length <= 1
          ? `Pulling item from postmaster: ${itemDescription} ...`
          : `Pulling item ${itemIndex + 1} of ${
              itemsToPull.length
            } from postmaster: ${itemDescription} ...`
      );
      const [pullItemErr] = await destiny2PostmasterService.pullItem(
        sessionId,
        characterInfo.membershipType,
        characterInfo.characterId,
        item.itemHash,
        item.itemInstanceId || null
      );
      if (pullItemErr) {
        failedToPullCount = failedToPullCount + 1;
        rowColumns.push("No");
        if (verbose) {
          rowColumns.push(pullItemErr.message);
        }
      } else {
        rowColumns.push("Yes");
        if (verbose) {
          rowColumns.push("");
        }
      }

      tableData.push(rowColumns);
    }

    logger.log(makeTable2(tableData, { flexibleColumns: verbose ? [3] : [1] }));

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
