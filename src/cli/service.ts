import { AppModule } from "~src/module/app.module";
import { BungieService } from "~src/service/bungie/bungie.service";
import { Destiny2ManifestService } from "~src/service/destiny2-manifest/destiny2-manifest.service";
import { SessionService } from "~src/service/session/session.service";

export const getServices = (appModule: AppModule) => ({
  bungieService: appModule.resolve<BungieService>("BungieService"),
  destiny2ManifestService: appModule.resolve<Destiny2ManifestService>("Destiny2ManifestService"),
  sessionService: appModule.resolve<SessionService>("SessionService")
});
