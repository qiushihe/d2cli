import * as fs from "fs";
import { homedir } from "os";
import * as path from "path";

import { triedFn } from "~src/helper/function.helper";
import { errorLogger } from "~src/service/log/log.service";
import { LOG_LEVEL } from "~src/service/log/log.service";

import { AppConfigName } from "./config.types";

export class ConfigService {
  getAppConfig(name: AppConfigName): [Error, null] | [null, string | null] {
    const [reloadErr, appConfig] = this.reloadAppConfig();
    if (reloadErr) {
      return [reloadErr, null];
    }

    return [null, appConfig[name]];
  }

  setAppConfig(name: AppConfigName, value: string | null): Error | null {
    const [reloadErr, appConfig] = this.reloadAppConfig();
    if (reloadErr) {
      return reloadErr;
    }

    appConfig[name] = value;

    const [saveErr] = triedFn(() =>
      fs.writeFileSync(this.getAppConfigPath(), JSON.stringify(appConfig, null, 2), "utf-8")
    );

    return saveErr;
  }

  getLogLevel(): number {
    const logError = errorLogger("ConfigService", LOG_LEVEL.error);

    let logLevelName: string;

    const [logLevelErr, _logLevelName] = this.getAppConfig(AppConfigName.LogLevel);
    if (logLevelErr) {
      logError(`Unable to get log level: ${logLevelErr.message}`);
      logLevelName = "error";
    } else {
      logLevelName = _logLevelName || "";
    }

    let logLevel = (LOG_LEVEL as Record<string, number>)[logLevelName];
    if (logLevel === null || logLevel === undefined) {
      logLevelName = "error";
    }

    return (LOG_LEVEL as Record<string, number>)[logLevelName];
  }

  getBungieApiRoot(): string {
    return "https://www.bungie.net/Platform";
  }

  // /common/destiny2_content/json/es/DestinyCollectibleDefinition-ed55fd73-3627-4784-9026-96aae1a7b82f.json
  getBungieAssetRoot(): string {
    return "https://www.bungie.net";
  }

  getBungieOauthRoot(): string {
    return "https://www.bungie.net/en/OAuth/Authorize";
  }

  getBungieOauthTokenRoot(): string {
    return "https://www.bungie.net/platform/app/oauth/token";
  }

  private reloadAppConfig(): [Error, null] | [null, Record<string, string | null>] {
    const [checkExistsErr, appConfigExists] = triedFn(() => fs.existsSync(this.getAppConfigPath()));
    if (checkExistsErr) {
      return [checkExistsErr, null];
    }
    if (!appConfigExists) {
      const [createErr] = triedFn(() =>
        fs.writeFileSync(this.getAppConfigPath(), JSON.stringify({}), "utf-8")
      );
      if (createErr) {
        return [createErr, null];
      }
    }

    const [readErr, appConfigString] = triedFn(() =>
      fs.readFileSync(this.getAppConfigPath(), "utf-8")
    );
    if (readErr) {
      return [readErr, null];
    }

    let appConfig: Record<string, string | null>;
    try {
      appConfig = JSON.parse(appConfigString);
    } catch {
      appConfig = {};
    }

    const [writeErr] = triedFn(() =>
      fs.writeFileSync(this.getAppConfigPath(), JSON.stringify(appConfig, null, 2), "utf-8")
    );
    if (writeErr) {
      return [writeErr, null];
    }

    return [null, appConfig];
  }

  private getAppConfigPath(): string {
    return path.resolve(homedir(), ".d2qdb-app-config.json");
  }
}
