import { AppModule } from "~src/module/app.module";
import { BungieApiService } from "~src/service/bungie-api/bungie.api.service";
import { ConfigService } from "~src/service/config/config.service";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";

import { BungieApiDestiny2Manifest } from "./bungie-manifest.types";
import { BungieApiDestiny2ManifestLanguage } from "./bungie-manifest.types";
import { BungieApiDestiny2ManifestComponent } from "./bungie-manifest.types";

export class BungieManifestService {
  private readonly config: ConfigService;
  private readonly bungieApiService: BungieApiService;

  constructor() {
    this.config = AppModule.getDefaultInstance().resolve<ConfigService>("ConfigService");
    this.bungieApiService =
      AppModule.getDefaultInstance().resolve<BungieApiService>("BungieApiService");
  }

  async getDestiny2ManifestComponent<T>(
    language: BungieApiDestiny2ManifestLanguage,
    component: BungieApiDestiny2ManifestComponent
  ): Promise<[Error, null] | [null, T]> {
    const logger = this.getLogger();

    const [manifestErr, manifestJson] = await this.getDestiny2Manifest();
    if (manifestErr) {
      return [manifestErr, null];
    } else {
      const localizedManifest = manifestJson.jsonWorldComponentContentPaths[language];
      if (!localizedManifest) {
        return [
          logger.loggedError(`Unable to find localized manifest for language: ${language}`),
          null
        ];
      }

      const localizedManifestUrl = this.config.getBungieAssetRoot() + localizedManifest[component];
      logger.debug(`Localized ${language}/${component} manifest URL: ${localizedManifestUrl}`);

      const [fetchComponentErr, componentRes] = await this.bungieApiService.sendRequest(
        localizedManifestUrl,
        {
          method: "GET"
        }
      );
      if (fetchComponentErr) {
        return [
          logger.loggedError(`Unable to fetch manifest component: ${fetchComponentErr.message}`),
          null
        ];
      }

      const [componentJsonErr, componentJson] = await this.bungieApiService.extractResponseJson(
        componentRes
      );
      if (componentJsonErr) {
        return [
          logger.loggedError(`Unable to extract manifest component: ${componentJsonErr.message}`),
          null
        ];
      }

      return [null, componentJson as T];
    }
  }

  async getDestiny2Manifest(): Promise<[Error, null] | [null, BungieApiDestiny2Manifest]> {
    const logger = this.getLogger();

    const [manifestErr, manifestRes] = await this.bungieApiService.sendApiRequest(
      "GET",
      "/Destiny2/Manifest",
      null
    );
    if (manifestErr) {
      return [
        logger.loggedError(`Unable to fetch Destiny 2 manifest: ${manifestErr.message}`),
        null
      ];
    } else {
      const [manifestJsonErr, manifestJson] =
        await this.bungieApiService.extractApiResponse<BungieApiDestiny2Manifest>(manifestRes);
      if (manifestJsonErr) {
        return [
          logger.loggedError(
            `Unable to extract Destiny 2 manifest response: ${manifestJsonErr.message}`
          ),
          null
        ];
      } else if (!manifestJson.Response) {
        return [logger.loggedError("Missing Destiny 2 manifest in response"), null];
      } else {
        return [null, manifestJson.Response];
      }
    }
  }

  private getLogger(): Logger {
    return AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("BungieManifestService");
  }
}
