import { AppModule } from "~src/module/app.module";
import { CacheService } from "~src/service/cache/cache.service";
import { Destiny2ManifestService } from "~src/service/destiny2-manifest/destiny2-manifest.service";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";
import { DestinyVendorDefinition } from "~type/bungie-api/destiny/definitions.types";
import { DestinyProgressionDefinition } from "~type/bungie-api/destiny/definitions.types";
import { DestinyDestinationDefinition } from "~type/bungie-api/destiny/definitions.types";
import { DestinyPlaceDefinition } from "~type/bungie-api/destiny/definitions.types";
import { DestinyGenderDefinition } from "~type/bungie-api/destiny/definitions.types";
import { DestinyRaceDefinition } from "~type/bungie-api/destiny/definitions.types";
import { DestinyClassDefinition } from "~type/bungie-api/destiny/definitions.types";
import { DestinyStatDefinition } from "~type/bungie-api/destiny/definitions.types";
import { DestinyInventoryItemDefinition } from "~type/bungie-api/destiny/definitions.types";
import { Destiny2ManifestLanguage } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestDestinationDefinitions } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestPlaceDefinitions } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestProgressionDefinitions } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestVendorDefinitions } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestStatDefinitions } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestGenderDefinition } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestRaceDefinition } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestClassDefinition } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestComponent } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestInventoryItemDefinitions } from "~type/bungie-asset/destiny2.types";

export class ManifestDefinitionService {
  private readonly destiny2ManifestService: Destiny2ManifestService;
  private readonly cacheService: CacheService;

  constructor() {
    this.destiny2ManifestService = AppModule.getDefaultInstance().resolve(Destiny2ManifestService);
    this.cacheService = AppModule.getDefaultInstance().resolve(CacheService);
  }

  async getProgressionDefinition(
    hash: number
  ): Promise<[Error, null] | [null, DestinyProgressionDefinition]> {
    return await this.getManifestDefinition<
      Destiny2ManifestProgressionDefinitions,
      DestinyProgressionDefinition
    >(Destiny2ManifestComponent.ProgressionDefinition, "progression-definition", hash);
  }

  async getDestinationDefinition(
    hash: number
  ): Promise<[Error, null] | [null, DestinyDestinationDefinition]> {
    return await this.getManifestDefinition<
      Destiny2ManifestDestinationDefinitions,
      DestinyDestinationDefinition
    >(Destiny2ManifestComponent.DestinationDefinition, "destination-definition", hash);
  }

  async getPlaceDefinition(hash: number): Promise<[Error, null] | [null, DestinyPlaceDefinition]> {
    return await this.getManifestDefinition<
      Destiny2ManifestPlaceDefinitions,
      DestinyPlaceDefinition
    >(Destiny2ManifestComponent.PlaceDefinition, "place-definition", hash);
  }

  async getVendorDefinition(
    hash: number
  ): Promise<[Error, null] | [null, DestinyVendorDefinition]> {
    return await this.getManifestDefinition<
      Destiny2ManifestVendorDefinitions,
      DestinyVendorDefinition
    >(Destiny2ManifestComponent.VendorDefinition, "vendor-definition", hash);
  }

  async getGenderDefinition(
    hash: number
  ): Promise<[Error, null] | [null, DestinyGenderDefinition]> {
    return await this.getManifestDefinition<
      Destiny2ManifestGenderDefinition,
      DestinyGenderDefinition
    >(Destiny2ManifestComponent.GenderDefinition, "gender-definition", hash);
  }

  async getRaceDefinition(hash: number): Promise<[Error, null] | [null, DestinyRaceDefinition]> {
    return await this.getManifestDefinition<Destiny2ManifestRaceDefinition, DestinyRaceDefinition>(
      Destiny2ManifestComponent.RaceDefinition,
      "race-definition",
      hash
    );
  }

  async getClassDefinition(hash: number): Promise<[Error, null] | [null, DestinyClassDefinition]> {
    return await this.getManifestDefinition<
      Destiny2ManifestClassDefinition,
      DestinyClassDefinition
    >(Destiny2ManifestComponent.ClassDefinition, "class-definition", hash);
  }

  async getStatDefinition(hash: number): Promise<[Error, null] | [null, DestinyStatDefinition]> {
    return await this.getManifestDefinition<Destiny2ManifestStatDefinitions, DestinyStatDefinition>(
      Destiny2ManifestComponent.StatDefinition,
      "stat-definition",
      hash
    );
  }

  async getItemDefinition(
    hash: number
  ): Promise<[Error, null] | [null, DestinyInventoryItemDefinition]> {
    return await this.getManifestDefinition<
      Destiny2ManifestInventoryItemDefinitions,
      DestinyInventoryItemDefinition
    >(Destiny2ManifestComponent.InventoryItemDefinition, "item-definition", hash);
  }

  async getSocketCategoryDefinition(
    hash: number
  ): Promise<[Error, null] | [null, DestinyInventoryItemDefinition]> {
    return await this.getManifestDefinition<
      Destiny2ManifestInventoryItemDefinitions,
      DestinyInventoryItemDefinition
    >(Destiny2ManifestComponent.SocketCategoryDefinition, "socket-category-definition", hash);
  }

  private async getManifestDefinition<
    TManifestComponent extends Record<string, TItemType>,
    TItemType
  >(
    component: Destiny2ManifestComponent,
    typeName: string,
    hash: number
  ): Promise<[Error, null] | [null, TItemType]> {
    const logger = this.getLogger();
    const language = this.getLanguage();

    const cacheNamespace = this.getCacheNamespace(component, typeName, `${hash}`);
    const cacheKey = `${typeName}-content`;

    const [readCacheErr, cachedItemDefinition] = await this.cacheService.get<TItemType>(
      cacheNamespace,
      cacheKey
    );
    if (readCacheErr) {
      return [readCacheErr, null];
    }

    if (cachedItemDefinition) {
      logger.debug(`Cache hit for ${typeName} manifest component for ${hash}`);
      return [null, cachedItemDefinition];
    } else {
      logger.debug(`Cache miss for ${typeName} manifest component for ${hash}`);
      logger.debug(`Retrieving ${typeName} manifest component for ${hash} ...`);
      const [itemDefinitionsErr, itemDefinitions] =
        await this.destiny2ManifestService.getManifestComponent<TManifestComponent>(
          language,
          component
        );
      if (itemDefinitionsErr) {
        return [itemDefinitionsErr, null];
      }

      const itemDefinition = itemDefinitions[hash];

      logger.debug(`Writing ${typeName} manifest component cache for ${hash}`);
      const writeCacheErr = await this.cacheService.set(
        cacheNamespace,
        cacheKey,
        itemDefinition,
        1000 * 60 * 60 * 24 * 7 // 7 days
      );
      if (writeCacheErr) {
        return [writeCacheErr, null];
      }

      return [null, itemDefinition];
    }
  }

  private getCacheNamespace(
    component: Destiny2ManifestComponent,
    itemType: string,
    itemId: string
  ) {
    const language = this.getLanguage();
    return `destiny2-manifest-component-${language}-${component}-${itemType}-${itemId}`;
  }

  // TODO: This should be configurable by `ConfigService`.
  private getLanguage() {
    return Destiny2ManifestLanguage.English;
  }

  private getLogger(): Logger {
    return AppModule.getDefaultInstance()
      .resolve(LogService)
      .getLogger("ManifestDefinitionService");
  }
}
