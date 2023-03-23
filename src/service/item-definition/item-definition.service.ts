import { AppModule } from "~src/module/app.module";
import { CacheService } from "~src/service/cache/cache.service";
import { Destiny2ManifestService } from "~src/service/destiny2-manifest/destiny2-manifest.service";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";
import { DestinyInventoryItemDefinition } from "~type/bungie-api/destiny/definitions.types";
import { Destiny2ManifestLanguage } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestComponent } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestInventoryItemDefinitions } from "~type/bungie-asset/destiny2.types";

// Cache individual item definition for 7 days
const CACHE_EXPIRY = 1000 * 60 * 60 * 24 * 7;

export class ItemDefinitionService {
  private readonly destiny2ManifestService: Destiny2ManifestService;
  private readonly cacheService: CacheService;

  constructor() {
    this.destiny2ManifestService =
      AppModule.getDefaultInstance().resolve<Destiny2ManifestService>("Destiny2ManifestService");
    this.cacheService = AppModule.getDefaultInstance().resolve<CacheService>("CacheService");
  }

  async getItemDefinition(
    itemHash: number
  ): Promise<[Error, null] | [null, DestinyInventoryItemDefinition]> {
    // TODO: This should be configurable by `ConfigService`.
    const language = Destiny2ManifestLanguage.English;
    const component = Destiny2ManifestComponent.InventoryItemDefinition;

    const logger = this.getLogger();
    const cacheNamespace = `destiny2-manifest-component-${language}-${component}-item-definition-${itemHash}`;
    const cacheKey = "item-definition-content";

    const [readCacheErr, cachedItemDefinition] =
      await this.cacheService.get<DestinyInventoryItemDefinition>(cacheNamespace, cacheKey);
    if (readCacheErr) {
      return [readCacheErr, null];
    }

    if (cachedItemDefinition) {
      logger.debug(
        `Cache hit for Destiny 2 manifest component ${language}/${component} item definition ${itemHash}`
      );
      return [null, cachedItemDefinition];
    } else {
      logger.debug(
        `Cache miss for Destiny 2 manifest component ${language}/${component} item definition ${itemHash}`
      );

      const [itemDefinitionsErr, itemDefinitions] =
        await this.destiny2ManifestService.getManifestComponent<Destiny2ManifestInventoryItemDefinitions>(
          language,
          component
        );
      if (itemDefinitionsErr) {
        return [itemDefinitionsErr, null];
      }

      const itemDefinition = itemDefinitions[itemHash];

      const writeCacheErr = await this.cacheService.set(
        cacheNamespace,
        cacheKey,
        itemDefinition,
        CACHE_EXPIRY
      );
      if (writeCacheErr) {
        return [writeCacheErr, null];
      }

      return [null, itemDefinition];
    }
  }

  private getLogger(): Logger {
    return AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("ItemDefinitionService");
  }
}
