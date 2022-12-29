import * as path from "path";

import { BungieService } from "~src/service/bungie/bungie.service";
import { BungieOauthService } from "~src/service/bungie-oauth/bungie-oauth.service";
import { ConfigService } from "~src/service/config/config.service";
import { SessionService } from "~src/service/session/session.service";
import { FsStorageService } from "~src/service/storage/fs-storage.service";

import { AppModule } from "./app.module";

// IMPORTANT: Adjust this value if this file is moved!
const REPO_ROOT = path.resolve(__dirname, "../..");

const MODULE: Record<string, new () => any> = {
  ConfigService,
  BungieService,
  BungieOauthService,
  SessionService,
  FsStorageService
};

const appModule = AppModule.getDefaultInstance();

Object.entries(MODULE).forEach(([name, ModuleClass]) => {
  appModule.register(name, ModuleClass);
});

appModule.resolve<ConfigService>("ConfigService").setRepoRootPath(REPO_ROOT);
