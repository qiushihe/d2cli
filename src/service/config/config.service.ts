import * as process from "process";

export class ConfigService {
  private static defaultInstance: ConfigService;

  static getDefaultInstance(): ConfigService {
    if (!ConfigService.defaultInstance) {
      ConfigService.defaultInstance = new ConfigService();
    }
    return ConfigService.defaultInstance;
  }

  getBungieApiRoot(): string {
    return "https://www.bungie.net/Platform";
  }

  // /common/destiny2_content/json/es/DestinyCollectibleDefinition-ed55fd73-3627-4784-9026-96aae1a7b82f.json
  getBungieAssetRoot(): string {
    return "https://www.bungie.net";
  }

  getBungieApiKey(): string {
    return process.env.BUNGIE_API_KEY || "";
  }

  getBungieOauthRoot(): string {
    return "https://www.bungie.net/en/OAuth/Authorize";
  }

  getBungieOauthTokenRoot(): string {
    return "https://www.bungie.net/platform/app/oauth/token";
  }

  getBungieOauthClientId(): string {
    return process.env.BUNGIE_OAUTH_CLIENT_ID || "";
  }

  getBungieOauthClientSecret(): string {
    return process.env.BUNGIE_OAUTH_CLIENT_SECRET || "";
  }
}
