import { getSelectedCharacterInfo } from "~src/cli/command-helper/current-character.helper";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { sortedStats } from "~src/helper/character.helper";
import { fnWithSpinner } from "~src/helper/cli-promise.helper";
import { stringifyTable } from "~src/helper/table.helper";
import { AppModule } from "~src/module/app.module";
import { CharacterDescriptionService } from "~src/service/character-description/character-description.service";
import { Destiny2CharacterService } from "~src/service/destiny2-character/destiny2-character.service";
import { Destiny2ManifestService } from "~src/service/destiny2-manifest/destiny2-manifest.service";
import { LogService } from "~src/service/log/log.service";
import { Destiny2ManifestLanguage } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestComponent } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestStatDefinitions } from "~type/bungie-asset/destiny2.types";

import { sessionIdOption } from "../../command-option/session-id.option";
import { SessionIdCommandOptions } from "../../command-option/session-id.option";
import { verboseOption } from "../../command-option/verbose.option";
import { VerboseCommandOptions } from "../../command-option/verbose.option";

type CmdOptions = SessionIdCommandOptions & VerboseCommandOptions;

const cmd: CommandDefinition = {
  description: "Show stats of the currently selected Destiny 2 character",
  options: [sessionIdOption, verboseOption],
  action: async (args, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:character:stats");

    const { session: sessionId, verbose } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const destiny2ManifestService =
      AppModule.getDefaultInstance().resolve<Destiny2ManifestService>("Destiny2ManifestService");

    const destiny2CharacterService =
      AppModule.getDefaultInstance().resolve<Destiny2CharacterService>("Destiny2CharacterService");

    const characterDescriptionService =
      AppModule.getDefaultInstance().resolve<CharacterDescriptionService>(
        "CharacterDescriptionService"
      );

    const [statDefinitionsErr, statDefinitions] = await fnWithSpinner(
      "Retrieving stat definitions ...",
      () =>
        destiny2ManifestService.getManifestComponent<Destiny2ManifestStatDefinitions>(
          Destiny2ManifestLanguage.English,
          Destiny2ManifestComponent.StatDefinition
        )
    );
    if (statDefinitionsErr) {
      return logger.loggedError(
        `Unable to retrieve stat definitions: ${statDefinitionsErr.message}`
      );
    }

    const [characterInfoErr, characterInfo] = await getSelectedCharacterInfo(logger, sessionId);
    if (characterInfoErr) {
      return logger.loggedError(`Unable to character info: ${characterInfoErr.message}`);
    }

    const [characterErr, character] = await fnWithSpinner("Retrieving character ...", () =>
      destiny2CharacterService.getCharacter(
        sessionId,
        characterInfo.membershipType,
        characterInfo.membershipId,
        characterInfo.characterId
      )
    );
    if (characterErr) {
      return logger.loggedError(`Unable to retrieve character: ${characterErr.message}`);
    }

    const [characterDescriptionErr, characterDescription] = await fnWithSpinner(
      "Retrieving character description ...",
      () => characterDescriptionService.getDescription(character)
    );
    if (characterDescriptionErr) {
      return logger.loggedError(
        `Unable to retrieve character description: ${characterDescriptionErr.message}`
      );
    }

    const tableData: string[][] = [];

    tableData.push(["Stat", "Value", ...(verbose ? ["Description"] : [])]);

    tableData.push(["Class", characterDescription.class, ...(verbose ? [""] : [])]);
    tableData.push(["Physique", characterDescription.gender, ...(verbose ? [""] : [])]);
    tableData.push(["Race", characterDescription.race, ...(verbose ? [""] : [])]);

    sortedStats(character, statDefinitions).forEach(([, value, name, description]) => {
      tableData.push([name, `${value}`, ...(verbose ? [description] : [])]);
    });

    logger.log(stringifyTable(tableData));
  }
};

export default cmd;
