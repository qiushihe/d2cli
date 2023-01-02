import { CommandDefinition } from "~src/cli/d2qdb.types";
import { bgGreen, bgRed } from "~src/helper/colour.helper";
import { stringifyTable } from "~src/helper/table.helper";
import { AppModule } from "~src/module/app.module";
import { Destiny2CharacterService } from "~src/service/destiny2-character/destiny2-character.service";
import { Destiny2InventoryService } from "~src/service/destiny2-inventory/destiny2-inventory.service";
import { LogService } from "~src/service/log/log.service";

import { characterNumberArgument } from "../../command-argument/character-number.argument";
import { sessionIdOption } from "../../command-option/session-id.option";
import { verboseOption } from "../../command-option/verbose.option";
import { SessionCommandOptions } from "../command.types";
import { getPostmasterItems } from "./get-postmaster-items";

type CmdOptions = SessionCommandOptions & { verbose: boolean };

const cmd: CommandDefinition = {
  description: "Pull item(s) from Vanguard mailbox",
  options: [sessionIdOption, verboseOption],
  arguments: [characterNumberArgument],
  action: async (args, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:postmaster:pull");

    const { session: sessionId, verbose } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const destiny2CharacterService =
      AppModule.getDefaultInstance().resolve<Destiny2CharacterService>("Destiny2CharacterService");

    const destiny2InventoryService =
      AppModule.getDefaultInstance().resolve<Destiny2InventoryService>("Destiny2InventoryService");

    const [characterNumberString] = args;
    const characterNumber = parseInt(characterNumberString);
    if (isNaN(characterNumber)) {
      return logger.loggedError(`Invalid character number: ${characterNumberString}`);
    }

    if (characterNumber < 1 || characterNumber > 3) {
      return logger.loggedError(`Character number must be between 1 and 3`);
    }

    const [charactersErr, characters] = await destiny2CharacterService.getDestiny2Characters(
      sessionId
    );
    if (charactersErr) {
      return logger.loggedError(`Unable to list characters: ${charactersErr.message}`);
    }

    const character = characters[characterNumber - 1];

    const [postmasterItemsErr, postmasterItems] = await getPostmasterItems(
      sessionId,
      characterNumber
    );
    if (postmasterItemsErr) {
      return logger.loggedError(`Unable to fetch postmaster items: ${postmasterItemsErr.message}`);
    }

    const tableData: string[][] = [];

    const basicHeaders = ["#", "Description", "Pulled?"];
    if (verbose) {
      tableData.push([...basicHeaders, "Message"]);
    } else {
      tableData.push(basicHeaders);
    }

    for (
      let postmasterItemIndex = 0;
      postmasterItemIndex < postmasterItems.length;
      postmasterItemIndex++
    ) {
      const postmasterItem = postmasterItems[postmasterItemIndex];
      let itemDescription: string;

      const [itemDefinitionErr, itemDefinition] = await destiny2InventoryService.getItemDefinition(
        postmasterItem.itemHash
      );
      if (itemDefinitionErr) {
        itemDescription = `Item description error: ${itemDefinitionErr.message}`;
      } else {
        itemDescription = `${itemDefinition.displayProperties.name} (${itemDefinition.itemTypeAndTierDisplayName})`;
      }

      const itemCells = [`${postmasterItemIndex + 1}`, itemDescription];

      const pullItemErr = await destiny2InventoryService.pullItemFromPostmaster(
        sessionId,
        character.membershipType,
        character.id,
        postmasterItem.itemHash,
        postmasterItem.itemInstanceId || null
      );
      if (pullItemErr) {
        if (verbose) {
          tableData.push([...itemCells, bgRed("No"), pullItemErr.message]);
        } else {
          tableData.push([...itemCells, bgRed("No")]);
        }
      } else {
        if (verbose) {
          tableData.push([...itemCells, bgGreen("Yes"), ""]);
        } else {
          tableData.push([...itemCells, bgGreen("Yes")]);
        }
      }
    }

    logger.log(stringifyTable(tableData));
  }
};

export default cmd;
