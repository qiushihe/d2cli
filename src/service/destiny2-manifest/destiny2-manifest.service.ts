import { AppModule } from "~src/module/app.module";
import { BungieApiService } from "~src/service/bungie-api/bungie.api.service";
import { CacheService } from "~src/service/cache/cache.service";
import { ConfigService } from "~src/service/config/config.service";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";
import { DestinyManifest } from "~type/bungie-api/destiny/config.types";
import { Destiny2ManifestLanguage } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestComponent } from "~type/bungie-asset/destiny2.types";

// Manifest/Components cache expires in 24 hours
const CACHE_EXPIRY = 1000 * 60 * 60 * 24;

export class Destiny2ManifestService {
  private readonly config: ConfigService;
  private readonly bungieApiService: BungieApiService;
  private readonly cacheService: CacheService;

  constructor() {
    this.config = AppModule.getDefaultInstance().resolve(ConfigService);
    this.bungieApiService = AppModule.getDefaultInstance().resolve(BungieApiService);
    this.cacheService = AppModule.getDefaultInstance().resolve(CacheService);
  }

  async getManifestComponent<T>(
    language: Destiny2ManifestLanguage,
    component: Destiny2ManifestComponent
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

      const [manifestErr, manifestJson] = await this.getManifest();
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

        const [fetchManifestComponentErr, manifestComponent] = await this.fetchManifestComponent<T>(
          localizedManifest[component]
        );
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

  async getManifest(): Promise<[Error, null] | [null, DestinyManifest]> {
    const logger = this.getLogger();
    const cacheNamespace = "destiny2-manifest";
    const cacheKey = "manifest-content";

    const [readCacheErr, cachedManifest] = await this.cacheService.get<DestinyManifest>(
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

      const [fetchManifestErr, manifest] = await this.fetchManifest();
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

  private async fetchManifestComponent<T>(
    manifestComponentPath: string
  ): Promise<[Error, null] | [null, T]> {
    const logger = this.getLogger();

    const manifestComponentUrl = this.config.getBungieAssetRoot() + manifestComponentPath;

    logger.debug(`Fetching Destiny 2 manifest component from ${manifestComponentUrl} ...`);
    const [fetchManifestComponentErr, manifestComponentRes] =
      await this.bungieApiService.sendRequest(manifestComponentUrl, {
        method: "GET"
      });
    if (fetchManifestComponentErr) {
      return [
        logger.loggedError(
          `Unable to fetch Destiny 2 manifest component: ${fetchManifestComponentErr.message}`
        ),
        null
      ];
    }

    const [manifestComponentJsonErr, manifestComponentJson] =
      await this.bungieApiService.extractResponseJson(manifestComponentRes);
    if (manifestComponentJsonErr) {
      return [
        logger.loggedError(
          `Unable to extract Destiny 2 manifest component: ${manifestComponentJsonErr.message}`
        ),
        null
      ];
    }

    return [null, manifestComponentJson as T];
  }

  private async fetchManifest(): Promise<[Error, null] | [null, DestinyManifest]> {
    const logger = this.getLogger();

    logger.debug(`Fetching Destiny 2 manifest ...`);
    const [manifestErr, manifest] = await this.bungieApiService.sendApiRequest<
      null,
      DestinyManifest
    >(null, "GET", "/Destiny2/Manifest", null);
    if (manifestErr) {
      return [
        logger.loggedError(`Unable to fetch Destiny 2 manifest: ${manifestErr.message}`),
        null
      ];
    }

    return [null, manifest];
  }

  private getLogger(): Logger {
    return AppModule.getDefaultInstance().resolve(LogService).getLogger("Destiny2ManifestService");
  }
}
