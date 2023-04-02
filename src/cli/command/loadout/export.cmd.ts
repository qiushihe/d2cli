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

    const loadoutExportService = app.resolve(LoadoutExportService);

    const [characterInfoErr, characterInfo] =
      await characterSelectionService.ensureSelectedCharacter(sessionId);
    if (characterInfoErr) {
      return logger.loggedError(`Unable to get character info: ${characterInfoErr.message}`);
    }

    logger.info("Exporting loadout ...");
    const [exportedItemsErr, exportedItems] = await loadoutExportService.exportLoadout(
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
    const [exportedLoadoutName, exportedLoadout] = loadoutExportService.serializeExportedItems(
      loadoutName,
      exportedItems
    );

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
