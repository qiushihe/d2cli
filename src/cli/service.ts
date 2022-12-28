import { AppModule } from "~src/module/app.module";
import { BungieService } from "~src/service/bungie/bungie.service";
import { SessionService } from "~src/service/session/session.service";

export const getServices = (appModule: AppModule) => ({
  bungieService: appModule.resolve<BungieService>("BungieService"),
  sessionService: appModule.resolve<SessionService>("SessionService")
});
