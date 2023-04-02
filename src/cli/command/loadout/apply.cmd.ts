import fs from "fs";
import path from "path";

import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { verboseOption } from "~src/cli/command-option/cli.option";
import { VerboseCommandOptions } from "~src/cli/command-option/cli.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { getEditedContent } from "~src/helper/edit.helper";
import { promisedFn } from "~src/helper/promise.helper";
import { makeTable2 } from "~src/helper/table.helper";
import { CharacterSelectionService } from "~src/service/character-selection/character-selection.service";
import { ConfigService } from "~src/service/config/config.service";
import { AppConfigName } from "~src/service/config/config.types";
import { LoadoutApplyService } from "~src/service/loadout-apply/loadout-apply.service";
import { LoadoutAction } from "~src/service/loadout-apply/loadout-apply.types";
import { PastebinService } from "~src/service/pastebin/pastebin.service";

type CmdOptions = SessionIdCommandOptions &
  VerboseCommandOptions & {
    dryRun: boolean;
    edit: boolean;
    fromFile: string;
    fromPastebin: string;
  };

const PASTEBIN_ID_FROM_URL_REGEXP = new RegExp("^https://pastebin.com/([^/]*)$", "gi");

const describeLoadoutAction = (loadoutAction: LoadoutAction) => {
  if (loadoutAction.type === "DEPOSIT") {
    return `Move ${loadoutAction.itemName} from ${loadoutAction.characterName} to vault`;
  } else if (loadoutAction.type === "WITHDRAW") {
    return `Move ${loadoutAction.itemName} from vault to ${loadoutAction.characterName}`;
  } else if (loadoutAction.type === "EQUIP") {
    return `Equip ${loadoutAction.itemName}`;
  } else if (loadoutAction.type === "SOCKET") {
    return `Socket ${loadoutAction.plugItemName} into slot #${
      (loadoutAction.socketIndex || 0) + 1
    } of ${loadoutAction.itemName}`;
  } else {
    return "UNKNOWN LOADOUT ACTION";
  }
};

const cmd: CommandDefinition = {
  description: "Apply a loadout to the current character",
  options: [
    sessionIdOption,
    verboseOption,
    {
      flags: ["dry-run"],
      description: "Only list the expected loadout actions without applying them",
      defaultValue: false
    },
    {
      flags: ["edit"],
      description: "Edit the loadout content before applying it",
      defaultValue: false
    },
    {
      flags: ["from-file <file-path>"],
      description: "Path to the loadout file to apply",
      defaultValue: ""
    },
    {
      flags: ["from-pastebin <loadout-url>"],
      description: "Read the loadout from Pastebin",
      defaultValue: ""
    }
  ],
  action: async (_, opts, { app, logger }) => {
    const {
      session: sessionId,
      verbose,
      dryRun,
      edit: editBeforeImport,
      fromFile,
      fromPastebin
    } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const configService = app.resolve(ConfigService);

    const characterSelectionService = app.resolve(CharacterSelectionService);

    const pastebinService = app.resolve(PastebinService);

    const loadoutApplyService = app.resolve(LoadoutApplyService);

    let loadoutContent: string;

    if (fromFile) {
      const loadoutFilePath = path.isAbsolute(fromFile)
        ? fromFile
        : path.resolve(process.cwd(), fromFile);

      logger.info("Reading loadout file ...");
      const [fileContentErr, fileContent] = await promisedFn(
        () =>
          new Promise<string>((resolve, reject) => {
            fs.readFile(loadoutFilePath, "utf8", (err, data) => {
              err ? reject(err) : resolve(data);
            });
          })
      );
      if (fileContentErr) {
        return logger.loggedError(`Unable to read loadout file: ${fileContentErr.message}`);
      }

      loadoutContent = fileContent;
    } else if (fromPastebin) {
      const pastebinUrlMatch = PASTEBIN_ID_FROM_URL_REGEXP.exec(`${fromPastebin}`.trim());
      if (!pastebinUrlMatch) {
        return logger.loggedError(`Invalid Pastebin URL: ${fromPastebin}`);
      }

      const pasteId = `${pastebinUrlMatch[1]}`.trim();
      if (pasteId.length <= 0) {
        return logger.loggedError(`Unable to extract Paste ID from URL: ${fromPastebin}`);
      }

      const [pasteContentErr, pasteContent] = await pastebinService.getPasteById(pasteId);
      if (pasteContentErr) {
        return logger.loggedError(
          `Unable to read loadout from Pastebin: ${pasteContentErr.message}`
        );
      }

      loadoutContent = pasteContent;
    } else {
      return logger.loggedError(`Missing loadout source`);
    }

    if (editBeforeImport) {
      if (`${loadoutContent}`.trim().length <= 0) {
        return logger.loggedError(`Loading is empty`);
      }

      const [editorPathErr, editorPath] = configService.getAppConfig(AppConfigName.EditorPath);
      if (editorPathErr) {
        return logger.loggedError(`Unable to retrieve editor path: ${editorPathErr.message}`);
      }
      if (!editorPath || editorPath.trim().length <= 0) {
        return logger.loggedError(`Missing editor path`);
      }

      const [editedLoadoutContentErr, editedLoadoutContent] = await getEditedContent(
        logger,
        editorPath,
        `${loadoutContent}`.trim()
      );
      if (editedLoadoutContentErr) {
        return logger.loggedError(`Unable to edit loadout: ${editedLoadoutContentErr.message}`);
      }

      loadoutContent = editedLoadoutContent;
    }

    if (`${loadoutContent}`.trim().length <= 0) {
      return logger.loggedError(`Loading is empty`);
    }

    const [characterInfoErr, characterInfo] =
      await characterSelectionService.ensureSelectedCharacter(sessionId);
    if (characterInfoErr) {
      return logger.loggedError(`Unable to get character info: ${characterInfoErr.message}`);
    }

    logger.info("Parsing loadout ...");
    const [loadoutActionsErr, loadoutActions] = await loadoutApplyService.parseLoadout(
      sessionId,
      characterInfo.membershipType,
      characterInfo.membershipId,
      characterInfo.characterId,
      loadoutContent
    );
    if (loadoutActionsErr) {
      return logger.loggedError(`Unable to parse loadout: ${loadoutActionsErr.message}`);
    }

    const tableData: string[][] = [];

    const tableHeader = [];
    if (!dryRun) {
      tableHeader.push("Success?");
    }
    tableHeader.push("Character");
    tableHeader.push("Action");
    tableHeader.push("Item");
    if (verbose) {
      tableHeader.push("Item ID");
    }
    tableHeader.push("Socket");
    tableHeader.push("Plug");
    if (verbose) {
      tableHeader.push("Plug ID");
    }
    if (!dryRun) {
      tableHeader.push("Message");
    }
    tableData.push(tableHeader);

    for (let actionIndex = 0; actionIndex < loadoutActions.length; actionIndex++) {
      const loadoutAction = loadoutActions[actionIndex];
      let actionResult: "Yes" | "No" | "Skip";
      let actionMessage: string;

      if (!dryRun) {
        if (loadoutAction.skip) {
          actionResult = "Skip";
          actionMessage = "";
        } else {
          logger.info(`Applying loadout action: ${describeLoadoutAction(loadoutAction)} ...`);
          const loadoutActionErr = await loadoutApplyService.applyLoadoutAction(
            loadoutAction,
            sessionId,
            characterInfo.membershipType
          );
          if (loadoutActionErr) {
            actionResult = "No";
            actionMessage = loadoutActionErr.message;
          } else {
            actionResult = "Yes";
            actionMessage = "";
          }
        }
      } else {
        actionResult = "Skip";
        actionMessage = "";
      }

      const tableRow = [];
      if (!dryRun) {
        tableRow.push(actionResult);
      }
      tableRow.push(loadoutAction.characterName);
      tableRow.push(loadoutAction.type);
      tableRow.push(loadoutAction.itemName);
      if (verbose) {
        tableRow.push(`${loadoutAction.itemHash}:${loadoutAction.itemInstanceId}`);
      }
      tableRow.push(loadoutAction.socketIndex !== null ? `${loadoutAction.socketIndex + 1}` : "");
      tableRow.push(loadoutAction.plugItemName || "");
      if (verbose) {
        tableRow.push(loadoutAction.plugItemHash ? `${loadoutAction.plugItemHash}` : "");
      }
      if (!dryRun) {
        tableRow.push(actionMessage);
      }
      tableData.push(tableRow);
    }

    logger.log(
      makeTable2(tableData, { flexibleColumns: verbose ? [0, tableHeader.length - 1] : [0] })
    );
  }
};

export default cmd;
