import fs from "fs";
import path from "path";

import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { loadoutNameOption } from "~src/cli/command-option/loadout.option";
import { LoadoutNameCommandOptions } from "~src/cli/command-option/loadout.option";
import { includeUnequippedOption } from "~src/cli/command-option/loadout.option";
import { IncludeUnequippedCommandOptions } from "~src/cli/command-option/loadout.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { getEditedContent } from "~src/helper/edit.helper";
import { promisedFn } from "~src/helper/promise.helper";
import { AppModule } from "~src/module/app.module";
import { CharacterSelectionService } from "~src/service/character-selection/character-selection.service";
import { ConfigService } from "~src/service/config/config.service";
import { AppConfigName } from "~src/service/config/config.types";
import { LoadoutExportService } from "~src/service/loadout-export/loadout-export.service";
import { PastebinService } from "~src/service/pastebin/pastebin.service";

type CmdOptions = SessionIdCommandOptions &
  LoadoutNameCommandOptions &
  IncludeUnequippedCommandOptions & { edit: boolean; toFile: string; toPastebin: boolean };

const cmd: CommandDefinition = {
  description: "Export the currently equipped loadout",
  options: [
    sessionIdOption,
    loadoutNameOption,
    includeUnequippedOption,
    {
      flags: ["edit"],
      description: "Edit the loadout content before writing it to a destination",
      defaultValue: false
    },
    {
      flags: ["to-file <file-path>"],
      description: "Path to the loadout file to write",
      defaultValue: ""
    },
    {
      flags: ["to-pastebin"],
      description: "Save the loadout to Pastebin",
      defaultValue: false
    }
  ],
  action: async (_, opts, { app, logger }) => {
    const {
      session: sessionId,
      loadoutName,
      includeUnequipped,
      edit: editBeforeExport,
      toFile,
      toPastebin
    } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const configService = app.resolve(ConfigService);

    const characterSelectionService = app.resolve(CharacterSelectionService);

    const pastebinService = app.resolve(PastebinService);

    const [characterInfoErr, characterInfo] =
      await characterSelectionService.ensureSelectedCharacter(sessionId);
    if (characterInfoErr) {
      return logger.loggedError(`Unable to get character info: ${characterInfoErr.message}`);
    }

    logger.info("Exporting loadout ...");
    const [exportedItemsErr, exportedItems] = await AppModule.getDefaultInstance()
      .resolve(LoadoutExportService)
      .exportLoadout(
        sessionId,
        characterInfo.membershipType,
        characterInfo.membershipId,
        characterInfo.characterId,
        includeUnequipped
      );
    if (exportedItemsErr) {
      return logger.loggedError(`Unable to export loadout: ${exportedItemsErr.message}`);
    }

    logger.info("Serializing loadout ...");

    const loadoutLinesGroups: string[][] = [];

    const exportedLoadoutName = loadoutName || "Exported Loadout";
    loadoutLinesGroups.push([`LOADOUT // ${exportedLoadoutName}`]);

    exportedItems
      .filter((item) => item.type === "SUBCLASS")
      .forEach((item) => {
        const loadoutSubclassGroup: string[] = [];

        loadoutSubclassGroup.push(
          `EQUIP // ${item.itemHash}:${item.itemInstanceId} // ${item.itemName}`
        );

        item.plugs.forEach((plug) => {
          loadoutSubclassGroup.push(
            `SOCKET // ${item.itemHash}:${item.itemInstanceId}::index:${plug.socketIndex}::plug:${plug.itemHash} // ${plug.itemName}`
          );
        });

        loadoutLinesGroups.push(loadoutSubclassGroup);
      });

    const loadoutWeaponsGroup: string[] = [];

    exportedItems
      .filter((item) => !item.isExtra && item.type === "WEAPON")
      .forEach((item) => {
        loadoutWeaponsGroup.push(
          `EQUIP // ${item.itemHash}:${item.itemInstanceId} // ${item.itemName}`
        );
      });

    loadoutLinesGroups.push(loadoutWeaponsGroup);

    exportedItems
      .filter((item) => !item.isExtra && item.type === "ARMOUR")
      .forEach((item) => {
        const loadoutArmourGroup: string[] = [];

        loadoutArmourGroup.push(
          `EQUIP // ${item.itemHash}:${item.itemInstanceId} // ${item.itemName}`
        );

        item.plugs.forEach((plug) => {
          loadoutArmourGroup.push(
            `SOCKET // ${item.itemHash}:${item.itemInstanceId}::index:${plug.socketIndex}::plug:${plug.itemHash} // ${plug.itemName}`
          );
        });

        loadoutLinesGroups.push(loadoutArmourGroup);
      });

    const loadoutExtraWeaponsGroup: string[] = [];

    exportedItems
      .filter((item) => item.isExtra && item.type === "WEAPON")
      .forEach((item) => {
        loadoutExtraWeaponsGroup.push(
          `EXTRA // ${item.itemHash}:${item.itemInstanceId} // ${item.itemName}`
        );
      });

    loadoutLinesGroups.push(loadoutExtraWeaponsGroup);

    exportedItems
      .filter((item) => item.isExtra && item.type === "ARMOUR")
      .forEach((item) => {
        const loadoutExtraArmourGroup: string[] = [];

        loadoutExtraArmourGroup.push(
          `EXTRA // ${item.itemHash}:${item.itemInstanceId} // ${item.itemName}`
        );

        item.plugs.forEach((plug) => {
          loadoutExtraArmourGroup.push(
            `SOCKET // ${item.itemHash}:${item.itemInstanceId}::index:${plug.socketIndex}::plug:${plug.itemHash} // ${plug.itemName}`
          );
        });

        loadoutLinesGroups.push(loadoutExtraArmourGroup);
      });

    const exportedLoadout = loadoutLinesGroups
      .filter((loadoutLinesGroup) => loadoutLinesGroup.length > 0)
      .map((loadoutLinesGroup) => loadoutLinesGroup.join("\n"))
      .join("\n\n");

    let editedExportedLoadout: string;
    if (editBeforeExport) {
      const [editorPathErr, editorPath] = configService.getAppConfig(AppConfigName.EditorPath);
      if (editorPathErr) {
        return logger.loggedError(`Unable to retrieve editor path: ${editorPathErr.message}`);
      }
      if (!editorPath || editorPath.trim().length <= 0) {
        return logger.loggedError(`Missing editor path`);
      }

      const [editedLoadoutContentErr, editedLoadoutContent] = await getEditedContent(
        logger,
        editorPath.trim(),
        exportedLoadout
      );
      if (editedLoadoutContentErr) {
        return logger.loggedError(`Unable to edit loadout: ${editedLoadoutContentErr.message}`);
      }

      editedExportedLoadout = editedLoadoutContent;
    } else {
      editedExportedLoadout = exportedLoadout;
    }

    if (toFile) {
      const loadoutFilePath = path.isAbsolute(toFile)
        ? toFile
        : path.resolve(process.cwd(), toFile);

      logger.info("Writing to loadout file ...");
      const [writeErr] = await promisedFn(
        () =>
          new Promise<void>((resolve, reject) => {
            fs.writeFile(loadoutFilePath, editedExportedLoadout, "utf8", (err) => {
              err ? reject(err) : resolve();
            });
          })
      );
      if (writeErr) {
        return logger.loggedError(`Unable to write loadout file: ${writeErr.message}`);
      }
      logger.log(`Loadout exported to: ${loadoutFilePath}`);
    } else if (toPastebin) {
      logger.info("Writing loadout to Pastebin ...");
      const [pastebinUrlErr, pastebinUrl] = await pastebinService.createPaste(
        exportedLoadoutName,
        editedExportedLoadout
      );
      if (pastebinUrlErr) {
        return logger.loggedError(`Unable to write to Pastebin: ${pastebinUrlErr.message}`);
      }

      logger.log(`Loadout URL (Pastebin): ${pastebinUrl}`);
    } else {
      logger.log(editedExportedLoadout);
    }
  }
};

export default cmd;
