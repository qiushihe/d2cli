import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { CharacterService } from "~src/service/character/character.service";
import { CharacterReference } from "~src/service/character/character.types";
import { CharacterDescriptionService } from "~src/service/character-description/character-description.service";
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
  action: async (args, opts, { app, logger }) => {
    const { session: sessionId } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const sessionService = app.resolve(SessionService);

    const characterService = app.resolve(CharacterService);

    const characterDescriptionService = app.resolve(CharacterDescriptionService);

    const [characterNumberString] = args;
    const characterNumber = parseInt(characterNumberString);
    if (isNaN(characterNumber)) {
      return logger.loggedError(`Invalid character number: ${characterNumberString}`);
    }

    if (characterNumber < 1 || characterNumber > 3) {
      return logger.loggedError(`Character number must be between 1 and 3`);
    }

    logger.info("Retrieving characters ...");
    const [charactersErr, characters] = await characterService.getCharacters(sessionId);
    if (charactersErr) {
      return logger.loggedError(`Unable to retrieve characters: ${charactersErr.message}`);
    }

    const character = characters[characterNumber - 1];
    if (!character) {
      return logger.loggedError(`Character #${characterNumber} not found`);
    }

    logger.info("Retrieving character description ...");
    const [characterDescriptionErr, characterDescription] =
      await characterDescriptionService.getDescription(character);
    if (characterDescriptionErr) {
      return logger.loggedError(
        `Unable to retrieve character description: ${characterDescriptionErr.message}`
      );
    }

    logger.info("Storing current character selection ...");
    const [setDataErr] = await sessionService.setData<CharacterReference>(
      sessionId,
      SessionDataName.CurrentCharacterInfo,
      {
        membershipType: character.membershipType,
        membershipId: character.membershipId,
        characterId: character.characterId
      }
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
