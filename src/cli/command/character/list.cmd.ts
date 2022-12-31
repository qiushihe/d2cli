import { format } from "date-fns";

import { CommandDefinition } from "~src/cli/d2qdb.types";
import { TextGrid } from "~src/helper/text-grid";
import { AppModule } from "~src/module/app.module";
import { Destiny2CharacterService } from "~src/service/destiny2-character/destiny2-character.service";
import { LogService } from "~src/service/log/log.service";
import { SessionService } from "~src/service/session/session.service";

import { SessionCommandOptions } from "../command.types";
import { sessionIdOption } from "../session-id.option";

type CmdOptions = SessionCommandOptions & { _: never };

const cmd: CommandDefinition = {
  description: "List Destiny 2 characters",
  options: [sessionIdOption],
  action: async (_, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:character:list");

    const { session: sessionId } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const sessionService = AppModule.getDefaultInstance().resolve<SessionService>("SessionService");
    const destiny2CharacterService =
      AppModule.getDefaultInstance().resolve<Destiny2CharacterService>("Destiny2CharacterService");

    const [bungieNetMembershipIdErr, bungieNetMembershipId] =
      await sessionService.getBungieNetMembershipId(sessionId);
    if (bungieNetMembershipIdErr) {
      logger.error(`Unable to get Bungie.net membership ID: ${bungieNetMembershipIdErr.message}`);
    } else {
      const [charactersErr, characters] =
        await destiny2CharacterService.getBungieNetDestiny2Characters(bungieNetMembershipId);
      if (charactersErr) {
        logger.error(`Unable to list characters: ${charactersErr.message}`);
      } else {
        const grid = new TextGrid();

        grid.addRow(["ID", "Description", "Light Level", "Last Played"]);

        characters.forEach((character) => {
          grid.addRow([
            character.id,
            `${character.class} (${character.gender} ${character.race})`,
            `${character.lightLevel}`,
            format(character.lastPlayedAt, "hh:mmaaa MMM. do yyyy")
          ]);
        });

        logger.log(grid.toString());
      }
    }
  }
};

export default cmd;
