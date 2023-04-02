import { BungieApiService } from "~src/service/bungie-api/bungie.api.service";
import { BungieMembershipService } from "~src/service/bungie-membership/bungie-membership.service";
import { BungieOauthService } from "~src/service/bungie-oauth/bungie-oauth.service";
import { CacheService } from "~src/service/cache/cache.service";
import { CharacterService } from "~src/service/character/character.service";
import { CharacterDescriptionService } from "~src/service/character-description/character-description.service";
import { CharacterSelectionService } from "~src/service/character-selection/character-selection.service";
import { ConfigService } from "~src/service/config/config.service";
import { Destiny2ActionService } from "~src/service/destiny2-action/destiny2-action.service";
import { Destiny2ComponentDataService } from "~src/service/destiny2-component-data/destiny2-component-data.service";
import { Destiny2ManifestService } from "~src/service/destiny2-manifest/destiny2-manifest.service";
import { InventoryService } from "~src/service/inventory/inventory.service";
import { ItemService } from "~src/service/item/item.service";
import { LoadoutExportService } from "~src/service/loadout-export/loadout-export.service";
import { LogService } from "~src/service/log/log.service";
import { ManifestDefinitionService } from "~src/service/manifest-definition/manifest-definition.service";
import { PastebinService } from "~src/service/pastebin/pastebin.service";
import { PlugService } from "~src/service/plug/plug.service";
import { PostmasterService } from "~src/service/postmaster/postmaster.service";
import { SessionService } from "~src/service/session/session.service";
import { StatService } from "~src/service/stat/stat.service";
import { FsStorageService } from "~src/service/storage/fs-storage.service";

import { AppModule } from "./app.module";

const MODULE: (new () => any)[] = [
  BungieApiService,
  BungieMembershipService,
  BungieOauthService,
  CacheService,
  CharacterService,
  CharacterDescriptionService,
  CharacterSelectionService,
  ConfigService,
  Destiny2ActionService,
  Destiny2ComponentDataService,
  Destiny2ManifestService,
  InventoryService,
  ItemService,
  LoadoutExportService,
  LogService,
  ManifestDefinitionService,
  PastebinService,
  PlugService,
  PostmasterService,
  SessionService,
  StatService,
  FsStorageService
];

const appModule = AppModule.getDefaultInstance();

MODULE.forEach((ModuleClass) => {
  appModule.register(ModuleClass);
});
