// IMPORTANT: This file is NOT run within the working directory of the project's repo!
//            Therefore, this file MUST NOT import from any other files from the project!

import { spawn } from "child_process";
import path from "path";
import * as process from "process";

const LOG_LEVEL: string = "info"; // "debug" > "info" > "warning" > "error"

const bgRed = (msg: string) => `\x1b[41m${msg}\x1b[0m`;
const bgGreen = (msg: string) => `\x1b[42m${msg}\x1b[0m`;
const bgYellow = (msg: string) => `\x1b[43m${msg}\x1b[0m`;
const bgBlue = (msg: string) => `\x1b[44m${msg}\x1b[0m`;
const bgGray = (msg: string) => `\x1b[100m${msg}\x1b[0m`;

const getLogger = (namespace: string) => {
  let logLevel = 100;

  if (LOG_LEVEL === "error") {
    logLevel = 100;
  } else if (LOG_LEVEL === "warning") {
    logLevel = 200;
  } else if (LOG_LEVEL === "info") {
    logLevel = 300;
  } else if (LOG_LEVEL === "debug") {
    logLevel = 400;
  }

  const logError = (...args: any[]) => {
    if (logLevel >= 100) {
      console.error(`${bgRed(" ERR ")} [${namespace}]`, ...args);
    }
  };

  const logWarning = (...args: any[]) => {
    if (logLevel >= 200) {
      console.warn(`${bgYellow(" WRN ")} [${namespace}]`, ...args);
    }
  };
  const logInfo = (...args: any[]) => {
    if (logLevel >= 300) {
      console.log(`${bgGreen(" INF ")} [${namespace}]`, ...args);
    }
  };

  const logDebug = (...args: any[]) => {
    if (logLevel >= 400) {
      console.log(`${bgBlue(" DBG ")} [${namespace}]`, ...args);
    }
  };

  const logMessage = (...args: any[]) => {
    console.log(`${bgGray(" MSG ")} [${namespace}]`, ...args);
  };

  return {
    error: logError,
    warn: logWarning,
    info: logInfo,
    debug: logDebug,
    log: logMessage
  };
};

const promiseWithResolve = <T>(): [Promise<T>, (value: T) => void] => {
  let resolvePromise: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return [promise, resolvePromise!];
};

class OauthReturnRaw {
  async run(): Promise<number> {
    const logger = getLogger("cli:OauthReturnRaw");
    const workingDir = process.argv[2];
    const oauthReturnRawUrl = new URL(process.argv[3]);

    logger.log(`Handling OAuth return ...`);
    logger.debug(`Working directory: ${workingDir}`);
    logger.debug(`OAuth return raw URL: ${oauthReturnRawUrl}`);

    const oauthReturnUrl = new URL(`${oauthReturnRawUrl.protocol}//test`);
    oauthReturnUrl.host = oauthReturnRawUrl.host;
    oauthReturnUrl.pathname = `${oauthReturnRawUrl.pathname}/${(
      oauthReturnRawUrl.searchParams.toString() || ""
    )
      .split("&")
      .map((part) => part.split("=", 2)[1])
      .join("/")}`;

    logger.info(`OAuth return URL successfully parsed`);
    logger.debug(`OAuth return URL: ${oauthReturnUrl}`);

    const tsNodeCli = `${path.join(__dirname, "../../node_modules/.bin/ts-node")}`;
    const tsNodeCmd = `${tsNodeCli} -r tsconfig-paths/register`;
    const handlerPath = path.join(__dirname, "./oauth-return.ts");

    const cmd = spawn(`${tsNodeCmd} ${handlerPath} ${oauthReturnUrl}`, {
      shell: true,
      cwd: workingDir
    });

    cmd.stdout.on("data", process.stdout.write.bind(process.stdout));
    cmd.stderr.on("data", process.stderr.write.bind(process.stderr));

    logger.info(`OAuth return handler spawned`);

    const [cmdPromise, resolveCmdPromise] = promiseWithResolve<number>();

    cmd.on("exit", (code) => {
      resolveCmdPromise(code === null || code === undefined ? 0 : code);
    });

    const cmdExitCode = await cmdPromise;
    if (cmdExitCode === 0) {
      logger.log(`OAuth return handler completed successfully`);
      logger.log(`You may now close this window`);
    } else {
      logger.warn(`OAuth return handler did not complete successfully (code: ${cmdExitCode})`);
      logger.warn(`You can probably still close this window (question mark?)`);
    }

    return cmdExitCode;
  }
}

new OauthReturnRaw().run().then((code) => process.exit(code));
