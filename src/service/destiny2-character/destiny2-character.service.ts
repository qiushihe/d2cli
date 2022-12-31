import { AppModule } from "~src/module/app.module";
import { BungieApiService } from "~src/service/bungie-api/bungie.api.service";
import { BungieApiComponentType } from "~src/service/bungie-api/bungie-api.types";
import { Destiny2ManifestService } from "~src/service/destiny2-manifest/destiny2-manifest.service";
import { BungieApiDestiny2ManifestLanguage } from "~src/service/destiny2-manifest/destiny2-manifest.types";
import { BungieApiDestiny2ManifestComponent } from "~src/service/destiny2-manifest/destiny2-manifest.types";
import { BungieApiDestiny2GenderDefinition } from "~src/service/destiny2-manifest/destiny2-manifest.types";
import { BungieApiDestiny2RaceDefinition } from "~src/service/destiny2-manifest/destiny2-manifest.types";
import { BungieApiDestiny2ClassDefinition } from "~src/service/destiny2-manifest/destiny2-manifest.types";
import { Destiny2MembershipService } from "~src/service/destiny2-membership/destiny2-membership.service";
import { BungieApiDestiny2Profile } from "~src/service/destiny2-profile/destiny2-profile.types";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";

import { Destiny2Character } from "./destiny2-character.types";

export class Destiny2CharacterService {
  private readonly bungieApiService: BungieApiService;
  private readonly destiny2ManifestService: Destiny2ManifestService;
  private readonly destiny2MembershipService: Destiny2MembershipService;

  constructor() {
    this.bungieApiService =
      AppModule.getDefaultInstance().resolve<BungieApiService>("BungieApiService");
    this.destiny2ManifestService =
      AppModule.getDefaultInstance().resolve<Destiny2ManifestService>("Destiny2ManifestService");
    this.destiny2MembershipService =
      AppModule.getDefaultInstance().resolve<Destiny2MembershipService>(
        "Destiny2MembershipService"
      );
  }

  async getBungieNetDestiny2Characters(
    bungieNetMembershipId: string
  ): Promise<[Error, null] | [null, Destiny2Character[]]> {
    const [membershipErr, membership] =
      await this.destiny2MembershipService.getBungieNetDestiny2Membership(bungieNetMembershipId);
    if (membershipErr) {
      return [membershipErr, null];
    }

    return await this.getDestiny2Characters(membership.type, membership.id);
  }

  async getDestiny2Characters(
    membershipType: number,
    membershipId: string
  ): Promise<[Error, null] | [null, Destiny2Character[]]> {
    const [profileErr, profileRes] = await this.bungieApiService.sendApiRequest(
      "GET",
      `/Destiny2/${membershipType}/Profile/${membershipId}?components=${BungieApiComponentType.Characters}`,
      null
    );
    if (profileErr) {
      return [profileErr, null];
    } else {
      const [profileJsonErr, profileJson] =
        await this.bungieApiService.extractApiResponse<BungieApiDestiny2Profile>(profileRes);
      if (profileJsonErr) {
        return [profileJsonErr, null];
      } else {
        if (!profileJson.Response) {
          return [new Error("Profile missing response data"), null];
        }
        if (!profileJson.Response.characters) {
          return [new Error("Profile missing characters data"), null];
        }

        const [genderDefinitionErr, genderDefinition] =
          await this.destiny2ManifestService.getDestiny2ManifestComponent<BungieApiDestiny2GenderDefinition>(
            BungieApiDestiny2ManifestLanguage.English,
            BungieApiDestiny2ManifestComponent.GenderDefinition
          );
        if (genderDefinitionErr) {
          return [genderDefinitionErr, null];
        }

        const [raceDefinitionErr, raceDefinition] =
          await this.destiny2ManifestService.getDestiny2ManifestComponent<BungieApiDestiny2RaceDefinition>(
            BungieApiDestiny2ManifestLanguage.English,
            BungieApiDestiny2ManifestComponent.RaceDefinition
          );
        if (raceDefinitionErr) {
          return [raceDefinitionErr, null];
        }

        const [classDefinitionErr, classDefinition] =
          await this.destiny2ManifestService.getDestiny2ManifestComponent<BungieApiDestiny2ClassDefinition>(
            BungieApiDestiny2ManifestLanguage.English,
            BungieApiDestiny2ManifestComponent.ClassDefinition
          );
        if (classDefinitionErr) {
          return [classDefinitionErr, null];
        }

        const charactersData = profileJson.Response.characters.data;
        const characterEntries = Object.entries(charactersData);

        const characters: Destiny2Character[] = [];
        for (let characterIndex = 0; characterIndex < characterEntries.length; characterIndex++) {
          const [characterId, character] = characterEntries[characterIndex];

          characters.push({
            id: characterId,
            lightLevel: character.light,
            lastPlayedAt: new Date(character.dateLastPlayed),
            gender: genderDefinition[character.genderHash].displayProperties.name,
            race: raceDefinition[character.raceHash].displayProperties.name,
            class: classDefinition[character.classHash].displayProperties.name
          });
        }

        return [null, characters];
      }
    }
  }

  private getLogger(): Logger {
    return AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("Destiny2CharacterService");
  }
}
