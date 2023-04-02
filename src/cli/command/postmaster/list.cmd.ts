import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { verboseOption } from "~src/cli/command-option/cli.option";
import { VerboseCommandOptions } from "~src/cli/command-option/cli.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { makeTable2 } from "~src/helper/table.helper";
import { CharacterSelectionService } from "~src/service/character-selection/character-selection.service";
import { ManifestDefinitionService } from "~src/service/manifest-definition/manifest-definition.service";
import { PostmasterService } from "~src/service/postmaster/postmaster.service";

type CmdOptions = SessionIdCommandOptions & VerboseCommandOptions;

const cmd: CommandDefinition = {
  description: "List items in Vanguard mailbox",
  options: [sessionIdOption, verboseOption],
  action: async (_, opts, { app, logger }) => {
    const { session: sessionId, verbose } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const manifestDefinitionService = app.resolve(ManifestDefinitionService);

    const characterSelectionService = app.resolve(CharacterSelectionService);

    const postmasterService = app.resolve(PostmasterService);

    const [characterInfoErr, characterInfo] =
      await characterSelectionService.ensureSelectedCharacter(sessionId);
    if (characterInfoErr) {
      return logger.loggedError(`Unable to get character info: ${characterInfoErr.message}`);
    }

    logger.info("Retrieving postmaster items ...");
    const [postmasterItemsErr, postmasterItems] = await postmasterService.getItems(
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

    const tableData: string[][] = [];

    const tableHeader = ["#", "Description", "Quantity"];
    if (verbose) {
      tableHeader.push("ID");
    }
    tableData.push(tableHeader);

    for (
      let postmasterItemIndex = 0;
      postmasterItemIndex < postmasterItems.length;
      postmasterItemIndex++
    ) {
      const postmasterItem = postmasterItems[postmasterItemIndex];

      const [postmasterItemDefinitionErr, postmasterItemDefinition] =
        await manifestDefinitionService.getItemDefinition(postmasterItem.itemHash);
      if (postmasterItemDefinitionErr) {
        return logger.loggedError(
          `Unable to fetch item definition for ${postmasterItem.itemHash}: ${postmasterItemDefinitionErr.message}`
        );
      }
      if (!postmasterItemDefinition) {
        return logger.loggedError(`Missing item definition for ${postmasterItem.itemHash}`);
      }

      const rowColumns = [
        `${postmasterItemIndex + 1}`,
        `${postmasterItemDefinition.displayProperties.name} (${postmasterItemDefinition.itemTypeAndTierDisplayName})`,
        `${postmasterItem.quantity}`
      ];

      if (verbose) {
        if (postmasterItem.itemInstanceId) {
          rowColumns.push(`${postmasterItem.itemHash}:${postmasterItem.itemInstanceId}`);
        } else {
          rowColumns.push(`${postmasterItem.itemHash}`);
        }
      }

      tableData.push(rowColumns);
    }

    logger.log(makeTable2(tableData, { flexibleColumns: [1] }));
  }
};

export default cmd;
