import { SessionIdCommandOptions, sessionIdOption } from "~src/cli/command-option/cli.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { fnWithSpinner } from "~src/helper/cli-promise.helper";
import { AppModule } from "~src/module/app.module";
import { CharacterDescriptionService } from "~src/service/character-description/character-description.service";
import { Destiny2CharacterService } from "~src/service/destiny2-character/destiny2-character.service";
import { CharacterReference } from "~src/service/destiny2-character/destiny2-character.types";
import { LogService } from "~src/service/log/log.service";
import { SessionService } from "~src/service/session/session.service";
import { SessionDataName } from "~src/service/session/session.types";

type CmdOptions = SessionIdCommandOptions & { _: never };

const cmd: CommandDefinition = {
  description: "Select the current Destiny 2 character",
  options: [sessionIdOption],
  arguments: [
    {
      name: "character number",
      description: [
        "Destiny 2 character number;",
        "This is the order the characters are displayed on the Destiny 2 character selection screen,",
        "with the first character being number 1"
      ].join(" "),
      isRequired: true
    }
  ],
  action: async (args, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:character:select");

    const { session: sessionId } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const sessionService = AppModule.getDefaultInstance().resolve<SessionService>("SessionService");

    const destiny2CharacterService =
      AppModule.getDefaultInstance().resolve<Destiny2CharacterService>("Destiny2CharacterService");

    const characterDescriptionService =
      AppModule.getDefaultInstance().resolve<CharacterDescriptionService>(
        "CharacterDescriptionService"
      );

    const [characterNumberString] = args;
    const characterNumber = parseInt(characterNumberString);
    if (isNaN(characterNumber)) {
      return logger.loggedError(`Invalid character number: ${characterNumberString}`);
    }

    if (characterNumber < 1 || characterNumber > 3) {
      return logger.loggedError(`Character number must be between 1 and 3`);
    }

    const [charactersErr, characters] = await fnWithSpinner("Retrieving characters ...", () =>
      destiny2CharacterService.getCharacters(sessionId)
    );
    if (charactersErr) {
      return logger.loggedError(`Unable to retrieve characters: ${charactersErr.message}`);
    }

    const character = characters[characterNumber - 1];
    if (!character) {
      return logger.loggedError(`Character #${characterNumber} not found`);
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

    const setDataErr = await fnWithSpinner("Storing current character selection ...", () =>
      sessionService.setData<CharacterReference>(sessionId, SessionDataName.CurrentCharacterInfo, {
        membershipType: character.membershipType,
        membershipId: character.membershipId,
        characterId: character.characterId
      })
    );
    if (setDataErr) {
      return logger.loggedError(`Unable to store character selection: ${setDataErr.message}`);
    }

    logger.log(
      `Selected character #${characterNumber}: ${characterDescription.class} (${characterDescription.gender} ${characterDescription.race})`
    );
  }
};

export default cmd;
