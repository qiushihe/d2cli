import { AppModule } from "~src/module/app.module";
import { Destiny2CharacterService } from "~src/service/destiny2-character/destiny2-character.service";
import { Destiny2ManifestService } from "~src/service/destiny2-manifest/destiny2-manifest.service";
import { Destiny2MembershipService } from "~src/service/destiny2-membership/destiny2-membership.service";
import { SessionService } from "~src/service/session/session.service";

export const getServices = (appModule: AppModule) => {
  const srv = <T>(name: string) => appModule.resolve<T>(name);

  return {
    destiny2CharacterService: srv<Destiny2CharacterService>("Destiny2CharacterService"),
    destiny2ManifestService: srv<Destiny2ManifestService>("Destiny2ManifestService"),
    destiny2MembershipService: srv<Destiny2MembershipService>("Destiny2MembershipService"),
    sessionService: srv<SessionService>("SessionService")
  };
};
