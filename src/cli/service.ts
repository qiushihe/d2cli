import { AppModule } from "~src/module/app.module";
import { BungieService } from "~src/service/bungie/bungie.service";
import { BungieManifestService } from "~src/service/bungie-manifest/bungie-manifest.service";
import { SessionService } from "~src/service/session/session.service";

export const getServices = (appModule: AppModule) => ({
  bungieService: appModule.resolve<BungieService>("BungieService"),
  bungieManifestService: appModule.resolve<BungieManifestService>("BungieManifestService"),
  sessionService: appModule.resolve<SessionService>("SessionService")
});
