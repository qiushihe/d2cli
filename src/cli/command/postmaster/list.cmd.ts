import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { verboseOption } from "~src/cli/command-option/cli.option";
import { VerboseCommandOptions } from "~src/cli/command-option/cli.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { getSelectedCharacterInfo } from "~src/helper/current-character.helper";
import { getPostmasterItems } from "~src/helper/postmaster.helper";
import { stringifyTable } from "~src/helper/table.helper";
import { AppModule } from "~src/module/app.module";
import { LogService } from "~src/service/log/log.service";
import { ManifestDefinitionService } from "~src/service/manifest-definition/manifest-definition.service";

type CmdOptions = SessionIdCommandOptions & VerboseCommandOptions;

const cmd: CommandDefinition = {
  description: "List items in Vanguard mailbox",
  options: [sessionIdOption, verboseOption],
  action: async (_, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:postmaster:list");

    const { session: sessionId, verbose } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const manifestDefinitionService =
      AppModule.getDefaultInstance().resolve<ManifestDefinitionService>(
        "ManifestDefinitionService"
      );

    const [characterInfoErr, characterInfo] = await getSelectedCharacterInfo(logger, sessionId);
    if (characterInfoErr) {
      return logger.loggedError(`Unable to get character info: ${characterInfoErr.message}`);
    }

    logger.info("Retrieving postmaster items ...");
    const [postmasterItemsErr, postmasterItems] = await getPostmasterItems(
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

      logger.info(`Fetching item definition for ${postmasterItem.itemHash} ...`);
      const [postmasterItemDefinitionErr, postmasterItemDefinition] =
        await manifestDefinitionService.getItemDefinition(postmasterItem.itemHash);
      if (postmasterItemDefinitionErr) {
        return logger.loggedError(
          `Unable to fetch item definition for ${postmasterItem.itemHash}: ${postmasterItemDefinitionErr.message}`
        );
      }

      if (!postmasterItemDefinition) {
        tableData.push([
          `${postmasterItemIndex + 1}`,
          `Missing item definition for hash ${postmasterItem.itemHash}`,
          "x ???"
        ]);
      } else {
        const basicCells = [
          `${postmasterItemIndex + 1}`,
          `${postmasterItemDefinition.displayProperties.name} (${postmasterItemDefinition.itemTypeAndTierDisplayName})`,
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
