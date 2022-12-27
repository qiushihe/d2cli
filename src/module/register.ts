import { BungieService } from "~src/service/bungie/bungie.service";
import { BungieOauthService } from "~src/service/bungie-oauth/bungie-oauth.service";
import { ConfigService } from "~src/service/config/config.service";

import { AppModule } from "./app.module";

const MODULE: Record<string, new () => any> = {
  ConfigService,
  BungieService,
  BungieOauthService
};

const appModule = AppModule.getDefaultInstance();

Object.entries(MODULE).forEach(([name, ModuleClass]) => {
  appModule.register(name, ModuleClass);
});
