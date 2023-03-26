import childProcess from "child_process";
import fs from "fs";
import { tmpdir } from "os";
import path from "path";

import { promisedFn } from "~src/helper/promise.helper";
import { uuidV4 } from "~src/helper/uuid.helper";
import { Logger } from "~src/service/log/log.types";

export const getEditedContent = async (
  logger: Logger,
  editorPath: string,
  content: string
): Promise<[Error, null] | [null, string]> => {
  const tmpFilePath = path.resolve(tmpdir(), `d2-cli-edit-content-${uuidV4()}.txt`);

  logger.info("Writing to temporary file ...");
  const [writeErr] = await promisedFn(
    () =>
      new Promise<void>((resolve, reject) => {
        fs.writeFile(tmpFilePath, content, "utf8", (err) => {
          err ? reject(err) : resolve();
        });
      })
  );
  if (writeErr) {
    return [logger.loggedError(`Unable to write to temporary file: ${writeErr.message}`), null];
  }

  let resolveEditorProcessPromise: ((value: any) => void) | null = null;
  const editorProcessPromise = new Promise<any>((resolve) => {
    resolveEditorProcessPromise = resolve;
  });
  if (!resolveEditorProcessPromise) {
    return [new Error("Invalid child promise resolve function"), null];
  }

  const editorProcess = childProcess.spawn(editorPath, [tmpFilePath], { stdio: "inherit" });

  editorProcess.on("exit", resolveEditorProcessPromise);
  editorProcess.on("close", resolveEditorProcessPromise);
  editorProcess.on("error", resolveEditorProcessPromise);

  const editorErr = await editorProcessPromise;
  if (editorErr) {
    return [new Error(`Editor exited with error: ${JSON.stringify(editorErr)}`), null];
  }

  logger.info("Reading temporary loadout file ...");
  const [tmpFileContentErr, tmpFileContent] = await promisedFn(
    () =>
      new Promise<string>((resolve, reject) => {
        fs.readFile(tmpFilePath, "utf8", (err, data) => {
          err ? reject(err) : resolve(data);
        });
      })
  );
  if (tmpFileContentErr) {
    return [
      logger.loggedError(`Unable to read temporary file: ${tmpFileContentErr.message}`),
      null
    ];
  }

  return [null, `${tmpFileContent}`.trim()];
};
