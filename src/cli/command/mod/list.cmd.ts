import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { verboseOption } from "~src/cli/command-option/cli.option";
import { VerboseCommandOptions } from "~src/cli/command-option/cli.option";
import { showAllOption } from "~src/cli/command-option/cli.option";
import { ShowAllCommandOptions } from "~src/cli/command-option/cli.option";
import { itemIdentifierOption } from "~src/cli/command-option/item.option";
import { ItemIdentifierCommandOptions } from "~src/cli/command-option/item.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { parseItemIdentifier } from "~src/helper/item.helper";
import { makeTable2 } from "~src/helper/table.helper";
import { CharacterSelectionService } from "~src/service/character-selection/character-selection.service";
import { ItemService } from "~src/service/item/item.service";
import { ManifestDefinitionService } from "~src/service/manifest-definition/manifest-definition.service";
import { PlugService } from "~src/service/plug/plug.service";

type CmdOptions = SessionIdCommandOptions &
  VerboseCommandOptions &
  ShowAllCommandOptions &
  ItemIdentifierCommandOptions;

const cmd: CommandDefinition = {
  description: "List available mods for an item",
  options: [sessionIdOption, verboseOption, showAllOption, itemIdentifierOption],
  action: async (_, opts, { app, logger }) => {
    const { session: sessionId, verbose, showAll, item } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const itemIdentifier = parseItemIdentifier(item);
    if (!itemIdentifier) {
      return logger.loggedError(`Missing item identifier`);
    }
    if (!itemIdentifier.itemHash) {
      return logger.loggedError(`Missing item hash`);
    }

    const manifestDefinitionService = app.resolve(ManifestDefinitionService);

    const characterSelectionService = app.resolve(CharacterSelectionService);

    const plugService = app.resolve(PlugService);

    const itemService = app.resolve(ItemService);

    const [characterInfoErr, characterInfo] =
      await characterSelectionService.ensureSelectedCharacter(sessionId);
    if (characterInfoErr) {
      return logger.loggedError(`Unable to get character info: ${characterInfoErr.message}`);
    }

    logger.info("Retrieving armour mod socket indices ...");
    const [armourPlugItemSocketIndicesErr, armourPlugItemSocketIndices] =
      await plugService.getSocketIndices(
        sessionId,
        characterInfo.membershipType,
        characterInfo.membershipId,
        characterInfo.characterId,
        itemIdentifier.itemHash,
        "ARMOR MODS"
      );
    if (armourPlugItemSocketIndicesErr) {
      return logger.loggedError(
        `Unable to retrieve armour mod socket indices: ${armourPlugItemSocketIndicesErr.message}`
      );
    }

    logger.info("Retrieving available armour mods ...");
    const [armourPlugItemHashesErr, armourPlugItemHashes] = await plugService.getPlugItemHashes(
      sessionId,
      characterInfo.membershipType,
      characterInfo.membershipId,
      characterInfo.characterId,
      itemIdentifier.itemHash,
      "ARMOR MODS"
    );
    if (armourPlugItemHashesErr) {
      return logger.loggedError(
        `Unable to retrieve available armour mods: ${armourPlugItemHashesErr.message}`
      );
    }

    let equippedPlugHashes: number[] = [];
    if (itemIdentifier.itemInstanceId) {
      const [equippedPlugHashesErr, _equippedPlugHashes] =
        await itemService.getItemEquippedPlugHashes(
          sessionId,
          characterInfo.membershipType,
          characterInfo.membershipId,
          itemIdentifier.itemInstanceId
        );
      if (equippedPlugHashesErr) {
        return logger.loggedError(
          `Unable to retrieve equipped plug hashes: ${equippedPlugHashesErr.message}`
        );
      }

      equippedPlugHashes = armourPlugItemSocketIndices.map((index) => _equippedPlugHashes[index]);
    }

    const plugsBySlotIndex: { isEquipped: boolean; hash: number; label: string }[][] = [];
    for (let slotIndex = 0; slotIndex < armourPlugItemHashes.length; slotIndex++) {
      const plugItemHashes = armourPlugItemHashes[slotIndex];

      const plugs: { isEquipped: boolean; hash: number; label: string }[] = [];
      for (let plugIndex = 0; plugIndex < plugItemHashes.length; plugIndex++) {
        const plugItemHash = plugItemHashes[plugIndex];
        const isEquipped = equippedPlugHashes[slotIndex] === plugItemHash;

        logger.info(`Retrieving plug item definition for ${plugItemHash} ...`);
        const [plugItemDefinitionErr, plugItemDefinition] =
          await manifestDefinitionService.getItemDefinition(plugItemHash);
        if (plugItemDefinitionErr) {
          return logger.loggedError(
            `Unable to retrieve plug item definition: ${plugItemDefinitionErr.message}`
          );
        }

        plugs.push({
          isEquipped,
          hash: plugItemHash,
          label: plugItemDefinition?.displayProperties.name || "UNKNOWN PLUG"
        });
      }

      plugsBySlotIndex.push(plugs);
    }

    const tableData: string[][] = [];

    let tableFlexibleColumnIndices: number[] = [];
    const tableHeader = ["Slot"];
    if (showAll) {
      if (itemIdentifier.itemInstanceId) {
        tableHeader.push("Equipped");
        if (verbose) {
          tableHeader.push("ID");
        }
        tableHeader.push("Unequipped");
        if (verbose) {
          tableHeader.push("ID");
        }
        tableFlexibleColumnIndices = [1, 3];
      } else {
        tableHeader.push("Available");
        if (verbose) {
          tableHeader.push("ID");
        }
        tableFlexibleColumnIndices = [1];
      }
    } else {
      if (itemIdentifier.itemInstanceId) {
        tableHeader.push("Equipped");
        if (verbose) {
          tableHeader.push("ID");
        }
        tableFlexibleColumnIndices = [1];
      } else {
        tableHeader.push("Available");
        if (verbose) {
          tableHeader.push("ID");
        }
        tableFlexibleColumnIndices = [1];
      }
    }
    tableData.push(tableHeader);

    for (let slotIndex = 0; slotIndex < plugsBySlotIndex.length; slotIndex++) {
      const plugs = plugsBySlotIndex[slotIndex];

      const equippedPlug = plugs.find((plug) => plug.isEquipped) || null;
      const unequippedPlugs = plugs.filter((plug) => !plug.isEquipped);

      if (showAll) {
        for (
          let subRowIndex = 0;
          subRowIndex < Math.max(unequippedPlugs.length, 1);
          subRowIndex++
        ) {
          const tableRow = [subRowIndex === 0 ? `${slotIndex + 1}` : ""];

          if (itemIdentifier.itemInstanceId) {
            tableRow.push(subRowIndex === 0 ? (equippedPlug ? equippedPlug.label : "") : "");
            if (verbose) {
              tableRow.push(subRowIndex === 0 ? (equippedPlug ? `${equippedPlug.hash}` : "") : "");
            }
            tableRow.push(unequippedPlugs[subRowIndex].label);
            if (verbose) {
              tableRow.push(`${unequippedPlugs[subRowIndex].hash}`);
            }
          } else {
            tableRow.push(unequippedPlugs[subRowIndex].label);
            if (verbose) {
              tableRow.push(`${unequippedPlugs[subRowIndex].hash}`);
            }
          }

          tableData.push(tableRow);
        }
      } else {
        if (itemIdentifier.itemInstanceId) {
          const tableRow = [`${slotIndex + 1}`];

          tableRow.push(equippedPlug ? equippedPlug.label : "");
          if (verbose) {
            tableRow.push(equippedPlug ? `${equippedPlug.hash}` : "");
          }

          tableData.push(tableRow);
        } else {
          for (
            let subRowIndex = 0;
            subRowIndex < Math.max(unequippedPlugs.length, 1);
            subRowIndex++
          ) {
            const tableRow = [subRowIndex === 0 ? `${slotIndex + 1}` : ""];

            tableRow.push(unequippedPlugs[subRowIndex].label);
            if (verbose) {
              tableRow.push(`${unequippedPlugs[subRowIndex].hash}`);
            }

            tableData.push(tableRow);
          }
        }
      }
    }

    logger.log(makeTable2(tableData, { flexibleColumns: tableFlexibleColumnIndices }));
  }
};

export default cmd;
