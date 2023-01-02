import { CommandDefinition } from "~src/cli/d2qdb.types";
import { stringifyTable } from "~src/helper/table.helper";
import { AppModule } from "~src/module/app.module";
import { Destiny2CharacterService } from "~src/service/destiny2-character/destiny2-character.service";
import { Destiny2InventoryService } from "~src/service/destiny2-inventory/destiny2-inventory.service";
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
    if (!character) {
      return logger.loggedError(`Character not found at position ${characterNumber}`);
    }

    const [postmasterItemsErr, postmasterItems] = await destiny2InventoryService.getPostmasterItems(
      sessionId,
      character.membershipType,
      character.membershipId,
      character.id
    );
    if (postmasterItemsErr) {
      return logger.loggedError(
        `Unable to fetch items from postmaster: ${postmasterItemsErr.message}`
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

      const [itemDefinitionErr, itemDefinition] = await destiny2InventoryService.getItemDefinition(
        postmasterItem.itemHash
      );
      if (itemDefinitionErr) {
        tableData.push([
          `${postmasterItemIndex + 1}`,
          `Unable to get item definition for hash ${postmasterItem.itemHash}: ${itemDefinitionErr.message}`,
          "x ???"
        ]);
      } else {
        const basicCells = [
          `${postmasterItemIndex + 1}`,
          `${itemDefinition.displayProperties.name} (${itemDefinition.itemTypeAndTierDisplayName})`,
          `x ${postmasterItem.quantity}`
        ];
        if (verbose) {
          tableData.push([
            ...basicCells,
            `${postmasterItem.itemHash}`,
            postmasterItem.itemInstanceId
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
