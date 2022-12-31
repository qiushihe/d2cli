import { AppModule } from "~src/module/app.module";
import { BungieApiService } from "~src/service/bungie-api/bungie.api.service";
import { CacheService } from "~src/service/cache/cache.service";
import { ConfigService } from "~src/service/config/config.service";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";

import { BungieApiDestiny2Manifest } from "./bungie-manifest.types";
import { BungieApiDestiny2ManifestLanguage } from "./bungie-manifest.types";
import { BungieApiDestiny2ManifestComponent } from "./bungie-manifest.types";

// Manifest/Components cache expires in 24 hours
const CACHE_EXPIRY = 1000 * 60 * 60 * 24;

export class BungieManifestService {
  private readonly config: ConfigService;
  private readonly bungieApiService: BungieApiService;
  private readonly cacheService: CacheService;

  constructor() {
    this.config = AppModule.getDefaultInstance().resolve<ConfigService>("ConfigService");
    this.bungieApiService =
      AppModule.getDefaultInstance().resolve<BungieApiService>("BungieApiService");
    this.cacheService = AppModule.getDefaultInstance().resolve<CacheService>("CacheService");
  }

  async getDestiny2ManifestComponent<T>(
    language: BungieApiDestiny2ManifestLanguage,
    component: BungieApiDestiny2ManifestComponent
  ): Promise<[Error, null] | [null, T]> {
    const logger = this.getLogger();
    const cacheNamespace = `destiny2-manifest-component-${language}-${component}`;
    const cacheKey = "manifest-content";

    const [readCacheErr, cachedManifestComponent] = await this.cacheService.get<T>(
      cacheNamespace,
      cacheKey
    );
    if (readCacheErr) {
      return [readCacheErr, null];
    }

    if (cachedManifestComponent) {
      logger.debug(`Cache hit for Destiny 2 manifest component ${language}/${component}`);
      return [null, cachedManifestComponent];
    } else {
      logger.debug(`Cache miss for Destiny 2 manifest component ${language}/${component}`);

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

        const [fetchManifestComponentErr, manifestComponent] =
          await this.fetchDestiny2ManifestComponent<T>(localizedManifest[component]);
        if (fetchManifestComponentErr) {
          return [fetchManifestComponentErr, null];
        }

        const writeCacheErr = await this.cacheService.set(
          cacheNamespace,
          cacheKey,
          manifestComponent,
          CACHE_EXPIRY
        );
        if (writeCacheErr) {
          return [writeCacheErr, null];
        }

        return [null, manifestComponent];
      }
    }
  }

  async getDestiny2Manifest(): Promise<[Error, null] | [null, BungieApiDestiny2Manifest]> {
    const logger = this.getLogger();
    const cacheNamespace = "destiny2-manifest";
    const cacheKey = "manifest-content";

    const [readCacheErr, cachedManifest] = await this.cacheService.get<BungieApiDestiny2Manifest>(
      cacheNamespace,
      cacheKey
    );
    if (readCacheErr) {
      return [readCacheErr, null];
    }

    if (cachedManifest) {
      logger.debug(`Cache hit for Destiny 2 manifest`);
      return [null, cachedManifest];
    } else {
      logger.debug(`Cache miss for Destiny 2 manifest`);

      const [fetchManifestErr, manifest] = await this.fetchDestiny2Manifest();
      if (fetchManifestErr) {
        return [fetchManifestErr, null];
      }

      const writeCacheErr = await this.cacheService.set(
        cacheNamespace,
        cacheKey,
        manifest,
        CACHE_EXPIRY
      );
      if (writeCacheErr) {
        return [writeCacheErr, null];
      }

      return [null, manifest];
    }
  }

  private async fetchDestiny2ManifestComponent<T>(
    manifestComponentPath: string
  ): Promise<[Error, null] | [null, T]> {
    const logger = this.getLogger();

    const manifestComponentUrl = this.config.getBungieAssetRoot() + manifestComponentPath;
    logger.debug(`Fetching manifest component URL: ${manifestComponentUrl}`);

    const [fetchManifestComponentErr, manifestComponentRes] =
      await this.bungieApiService.sendRequest(manifestComponentUrl, {
        method: "GET"
      });
    if (fetchManifestComponentErr) {
      return [
        logger.loggedError(
          `Unable to fetch manifest component: ${fetchManifestComponentErr.message}`
        ),
        null
      ];
    }

    const [manifestComponentJsonErr, manifestComponentJson] =
      await this.bungieApiService.extractResponseJson(manifestComponentRes);
    if (manifestComponentJsonErr) {
      return [
        logger.loggedError(
          `Unable to extract manifest component: ${manifestComponentJsonErr.message}`
        ),
        null
      ];
    }

    return [null, manifestComponentJson as T];
  }

  private async fetchDestiny2Manifest(): Promise<
    [Error, null] | [null, BungieApiDestiny2Manifest]
  > {
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
