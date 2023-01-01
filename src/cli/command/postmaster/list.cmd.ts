import { CommandDefinition } from "~src/cli/d2qdb.types";
import { AppModule } from "~src/module/app.module";
import { Destiny2CharacterService } from "~src/service/destiny2-character/destiny2-character.service";
import { LogService } from "~src/service/log/log.service";

import { characterNumberArgument } from "../../command-argument/character-number.argument";
import { sessionIdOption } from "../../command-option/session-id.option";
import { verboseOption } from "../../command-option/verbose.option";
import { SessionCommandOptions } from "../command.types";

type CmdOptions = SessionCommandOptions & { verbose: boolean };

const cmd: CommandDefinition = {
  description: "List items in Vanguard mailbox",
  options: [sessionIdOption, verboseOption],
  arguments: [characterNumberArgument],
  action: async (args, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:postmaster:list");

    const { session: sessionId, verbose } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const destiny2CharacterService =
      AppModule.getDefaultInstance().resolve<Destiny2CharacterService>("Destiny2CharacterService");

    const [characterNumberString] = args;
    const characterNumber = parseInt(characterNumberString);
    if (isNaN(characterNumber)) {
      logger.error(`Invalid character number: ${characterNumberString}`);
    } else if (characterNumber < 1 || characterNumber > 3) {
      logger.error(`Character number must be between 1 and 3`);
    } else {
      const [charactersErr, characters] = await destiny2CharacterService.getDestiny2Characters(
        sessionId
      );
      if (charactersErr) {
        logger.error(`Unable to list characters: ${charactersErr.message}`);
      } else {
        const character = characters[characterNumber - 1];
        if (!character) {
          logger.error(`Character not found at position ${characterNumber}`);
        } else {
          logger.debug(`verbose: ${verbose}`);
          logger.debug(`membershipType: ${character.membershipType}`);
          logger.debug(`membershipId: ${character.membershipId}`);
          logger.debug(`id: ${character.id}`);
        }
      }
    }
  }
};

export default cmd;
