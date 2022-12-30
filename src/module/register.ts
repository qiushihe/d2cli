import { BungieService } from "~src/service/bungie/bungie.service";
import { BungieOauthService } from "~src/service/bungie-oauth/bungie-oauth.service";
import { ConfigService } from "~src/service/config/config.service";
import { FarmingReminderService } from "~src/service/farming-reminder/farming-reminder.service";
import { LogService } from "~src/service/log/log.service";
import { SessionService } from "~src/service/session/session.service";
import { FsStorageService } from "~src/service/storage/fs-storage.service";

import { AppModule } from "./app.module";

const MODULE: Record<string, new () => any> = {
  ConfigService,
  BungieService,
  BungieOauthService,
  SessionService,
  FsStorageService,
  FarmingReminderService,
  LogService
};

const appModule = AppModule.getDefaultInstance();

Object.entries(MODULE).forEach(([name, ModuleClass]) => {
  appModule.register(name, ModuleClass);
});
