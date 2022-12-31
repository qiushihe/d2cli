import { AppModule } from "~src/module/app.module";
import { BungieApiService } from "~src/service/bungie-api/bungie.api.service";
import { BungieManifestService } from "~src/service/bungie-manifest/bungie-manifest.service";
import { BungieApiDestiny2ManifestLanguage } from "~src/service/bungie-manifest/bungie-manifest.types";
import { BungieApiDestiny2ManifestComponent } from "~src/service/bungie-manifest/bungie-manifest.types";
import { BungieApiDestiny2GenderDefinition } from "~src/service/bungie-manifest/bungie-manifest.types";
import { BungieApiDestiny2RaceDefinition } from "~src/service/bungie-manifest/bungie-manifest.types";
import { BungieApiDestiny2ClassDefinition } from "~src/service/bungie-manifest/bungie-manifest.types";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";

import { BungieApiComponentType } from "./bungie.types";
import { BungieApiDestiny2Membership } from "./bungie.types";
import { BungieApiDestiny2Profile } from "./bungie.types";
import { Destiny2Character } from "./bungie.types";
import { Destiny2Membership } from "./bungie.types";

export class BungieService {
  private readonly bungieApiService: BungieApiService;
  private readonly bungieManifestService: BungieManifestService;

  constructor() {
    this.bungieApiService =
      AppModule.getDefaultInstance().resolve<BungieApiService>("BungieApiService");
    this.bungieManifestService =
      AppModule.getDefaultInstance().resolve<BungieManifestService>("BungieManifestService");
  }

  async test() {
    const logger = this.getLogger();

    const [membershipsErr, memberships] = await this.getDestiny2Memberships("28547862");
    if (membershipsErr) {
      logger.debug("!!! membershipsErr", membershipsErr);
    } else {
      const membership = memberships[0];
      logger.debug("!!! membership", membership);

      const [charactersErr, characters] = await this.getDestiny2Characters(membership);
      if (charactersErr) {
        logger.debug("!!! charactersErr", charactersErr);
      } else {
        logger.debug("!!! characters", characters);
      }
    }
  }

  async getDestiny2Characters(
    membership: Destiny2Membership
  ): Promise<[Error, null] | [null, Destiny2Character[]]> {
    const [profileErr, profileRes] = await this.bungieApiService.sendApiRequest(
      "GET",
      `/Destiny2/${membership.type}/Profile/${membership.id}?components=${BungieApiComponentType.Characters}`,
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
          await this.bungieManifestService.getDestiny2ManifestComponent<BungieApiDestiny2GenderDefinition>(
            BungieApiDestiny2ManifestLanguage.English,
            BungieApiDestiny2ManifestComponent.GenderDefinition
          );
        if (genderDefinitionErr) {
          return [genderDefinitionErr, null];
        }

        const [raceDefinitionErr, raceDefinition] =
          await this.bungieManifestService.getDestiny2ManifestComponent<BungieApiDestiny2RaceDefinition>(
            BungieApiDestiny2ManifestLanguage.English,
            BungieApiDestiny2ManifestComponent.RaceDefinition
          );
        if (raceDefinitionErr) {
          return [raceDefinitionErr, null];
        }

        const [classDefinitionErr, classDefinition] =
          await this.bungieManifestService.getDestiny2ManifestComponent<BungieApiDestiny2ClassDefinition>(
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

  async getDestiny2Memberships(
    bungieNetMembershipId: string
  ): Promise<[Error, null] | [null, Destiny2Membership[]]> {
    const [bungieNetUserErr, bungieNetUserRes] = await this.bungieApiService.sendApiRequest(
      "GET",
      `/User/GetBungieNetUserById/${bungieNetMembershipId}`,
      null
    );
    if (bungieNetUserErr) {
      return [bungieNetUserErr, null];
    }

    const [bungieNetUserJsonErr, bungieNetUserJson] =
      await this.bungieApiService.extractApiResponse(bungieNetUserRes);
    if (bungieNetUserJsonErr) {
      return [bungieNetUserJsonErr, null];
    }

    const uniqueName = bungieNetUserJson.Response.uniqueName.split("#", 2);

    const [searchDestinyPlayersErr, searchDestinyPlayersRes] =
      await this.bungieApiService.sendApiRequest(
        "POST",
        `/Destiny2/SearchDestinyPlayerByBungieName/All`,
        { displayName: uniqueName[0], displayNameCode: uniqueName[1] }
      );
    if (searchDestinyPlayersErr) {
      return [searchDestinyPlayersErr, null];
    }

    const [searchDestinyPlayersJsonErr, searchDestinyPlayersJson] =
      await this.bungieApiService.extractApiResponse<BungieApiDestiny2Membership[]>(
        searchDestinyPlayersRes
      );
    if (searchDestinyPlayersJsonErr) {
      return [searchDestinyPlayersJsonErr, null];
    }
    if (!searchDestinyPlayersJson.Response) {
      return [
        new Error(
          `Missing response in Destiny 2 players search result: ${JSON.stringify(
            searchDestinyPlayersJson
          )}`
        ),
        null
      ];
    }

    const effectiveMemberships = searchDestinyPlayersJson.Response.filter((membership) => {
      return membership.applicableMembershipTypes.includes(membership.crossSaveOverride);
    });

    const destiny2Memberships = effectiveMemberships.map<Destiny2Membership>((membership) => {
      return {
        type: membership.membershipType,
        id: membership.membershipId,
        displayName: [
          membership.bungieGlobalDisplayName,
          membership.bungieGlobalDisplayNameCode
        ].join("#")
      };
    });

    return [null, destiny2Memberships];
  }

  private getLogger(): Logger {
    return AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("BungieService");
  }
}
