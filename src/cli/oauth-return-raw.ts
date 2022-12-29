// IMPORTANT: This file is NOT run within the working directory of the project's repo!
//            Therefore, this file MUST NOT import from any other files from the project!

import { spawn } from "child_process";
import path from "path";
import * as process from "process";

const promiseWithResolve = <T>(): [Promise<T>, (value: T) => void] => {
  let resolvePromise: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return [promise, resolvePromise!];
};

class OauthReturnRaw {
  async run(): Promise<number> {
    const workingDir = process.argv[2];
    const oauthReturnRawUrl = new URL(process.argv[3]);

    console.log(`[OauthReturnRaw] Working Directory: ${workingDir}`);
    console.log(`[OauthReturnRaw] OAuth Return Raw URL: ${oauthReturnRawUrl}`);

    const oauthReturnUrl = new URL(`${oauthReturnRawUrl.protocol}//test`);
    oauthReturnUrl.host = oauthReturnRawUrl.host;
    oauthReturnUrl.pathname = `${oauthReturnRawUrl.pathname}/${(
      oauthReturnRawUrl.searchParams.toString() || ""
    )
      .split("&")
      .map((part) => part.split("=", 2)[1])
      .join("/")}`;

    console.log(`[OauthReturnRaw] OAuth Return URL: ${oauthReturnUrl}`);

    const tsNodeCli = `${path.join(__dirname, "../../node_modules/.bin/ts-node")}`;
    const tsNodeCmd = `${tsNodeCli} -r tsconfig-paths/register`;
    const handlerPath = path.join(__dirname, "./oauth-return.ts");

    const cmd = spawn(`${tsNodeCmd} ${handlerPath} ${oauthReturnUrl}`, {
      shell: true,
      cwd: workingDir
    });

    cmd.stdout.on("data", process.stdout.write.bind(process.stdout));

    cmd.stderr.on("data", process.stderr.write.bind(process.stderr));

    const [cmdPromise, resolveCmdPromise] = promiseWithResolve<number>();

    cmd.on("exit", (code) => {
      resolveCmdPromise(code === null || code === undefined ? 0 : code);
    });

    const cmdExitCode = await cmdPromise;
    if (cmdExitCode === 0) {
      console.log("[OauthReturnRaw] OAuth Return Handler completed successfully");
      console.log("[OauthReturnRaw] You may now close this window");
    } else {
      console.log(
        `[OauthReturnRaw] OAuth Return Handler did not complete successfully (code: ${cmdExitCode})`
      );
      console.log("[OauthReturnRaw] You can probably still close this window (question mark?)");
    }

    return cmdExitCode;
  }
}

new OauthReturnRaw().run().then((code) => process.exit(code));
