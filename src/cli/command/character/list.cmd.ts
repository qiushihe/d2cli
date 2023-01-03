import { format } from "date-fns";

import { CommandDefinition } from "~src/cli/d2cli.types";
import { fnWithSpinner } from "~src/helper/cli-promise.helper";
import { stringifyTable } from "~src/helper/table.helper";
import { AppModule } from "~src/module/app.module";
import { CharacterDescriptionService } from "~src/service/character-description/character-description.service";
import { Destiny2CharacterService } from "~src/service/destiny2-character/destiny2-character.service";
import { LogService } from "~src/service/log/log.service";

import { getCharacterSelectionInfo } from "../../command-helper/current-character.helper";
import { sessionIdOption } from "../../command-option/session-id.option";
import { verboseOption } from "../../command-option/verbose.option";
import { SessionCommandOptions } from "../command.types";

type CmdOptions = SessionCommandOptions & { verbose: boolean };

const cmd: CommandDefinition = {
  description: "List Destiny 2 characters",
  options: [sessionIdOption, verboseOption],
  action: async (_, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:character:list");

    const { session: sessionId, verbose } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const destiny2CharacterService =
      AppModule.getDefaultInstance().resolve<Destiny2CharacterService>("Destiny2CharacterService");

    const characterDescriptionService =
      AppModule.getDefaultInstance().resolve<CharacterDescriptionService>(
        "CharacterDescriptionService"
      );

    const [characterInfoErr, characterInfo] = await getCharacterSelectionInfo(logger, sessionId);
    if (characterInfoErr) {
      return characterInfoErr;
    }

    const [charactersErr, characters] = await fnWithSpinner("Retrieving characters ...", () =>
      destiny2CharacterService.getDestiny2Characters(sessionId)
    );
    if (charactersErr) {
      return logger.loggedError(`Unable to retrieve characters: ${charactersErr.message}`);
    }

    const tableData: string[][] = [];

    const basicHeaders = ["#", "Description", "Light Level"];
    if (verbose) {
      tableData.push([...basicHeaders, "Last Played", "ID", "Membership Type:ID"]);
    } else {
      tableData.push(basicHeaders);
    }

    for (let characterIndex = 0; characterIndex < characters.length; characterIndex++) {
      const character = characters[characterIndex];

      const isSelected =
        characterInfo?.membershipType === character.membershipType &&
        characterInfo?.membershipId === character.membershipId &&
        characterInfo?.characterId === character.characterId;

      const basicCells = [
        isSelected ? `>${characterIndex + 1}<` : ` ${characterIndex + 1} `,
        "",
        `${character.light}`
      ];

      const [characterDescriptionErr, characterDescription] = await fnWithSpinner(
        "Retrieving character description ...",
        () => characterDescriptionService.getDescription(character)
      );
      if (characterDescriptionErr) {
        basicCells[1] = `Error: ${characterDescriptionErr.message}`;
      } else {
        basicCells[1] = `${characterDescription.class} (${characterDescription.gender} ${characterDescription.race})`;
      }

      if (verbose) {
        const lastPlayed = new Date(character.dateLastPlayed);
        const lastPlayedMonth = format(lastPlayed, "MMM.");
        const lastPlayedDay = format(lastPlayed, "do").padStart(4, " ");
        const lastPlayedYear = format(lastPlayed, "yyyy");
        const lastPlayedTime = format(lastPlayed, "hh:mmaaa");

        tableData.push([
          ...basicCells,
          `${lastPlayedMonth} ${lastPlayedDay} ${lastPlayedYear} - ${lastPlayedTime}`,
          character.characterId,
          `${character.membershipType}:${character.membershipId}`
        ]);
      } else {
        tableData.push(basicCells);
      }
    }

    logger.log(stringifyTable(tableData));
  }
};

export default cmd;
