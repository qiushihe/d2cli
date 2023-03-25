import fetch, { Response } from "node-fetch";
import { URLSearchParams } from "url";

import { triedFn } from "~src/helper/function.helper";
import { promisedFn } from "~src/helper/promise.helper";
import { AppModule } from "~src/module/app.module";
import { ConfigService } from "~src/service/config/config.service";
import { AppConfigName } from "~src/service/config/config.types";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";

export class PastebinService {
  private readonly config: ConfigService;

  constructor() {
    this.config = AppModule.getDefaultInstance().resolve<ConfigService>("ConfigService");
  }

  async createPaste(name: string, content: string): Promise<[Error, null] | [null, string]> {
    const [apiKeyErr, apiKey] = this.config.getAppConfig(AppConfigName.PastebinApiKey);
    if (apiKeyErr) {
      return [apiKeyErr, null];
    }
    if (!apiKey) {
      return [new Error("Missing Pastebin API key"), null];
    }

    const params = new URLSearchParams();
    params.set("api_option", "paste");
    params.set("api_paste_private", "1"); // `1` means "unlisted"
    params.set("api_dev_key", apiKey);
    params.set("api_paste_name", name);
    params.set("api_paste_code", content);

    const [resErr, res] = await this.sendRequest(
      `${this.config.getPastebinApiRoot()}/api/api_post.php`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString()
      }
    );
    if (resErr) {
      return [resErr, null];
    }

    const [resTextErr, resText] = await promisedFn(() => res.text());
    if (resTextErr) {
      return [resTextErr, null];
    }

    const [pasteUrlErr, pasteUrl] = triedFn(() => new URL(`${resText}`.trim()));
    if (pasteUrlErr) {
      return [pasteUrlErr, null];
    }

    return [null, pasteUrl.toString()];
  }

  // async getPasteById(pasteId: string) {
  //   // await this.sendApiRequest("GET", `/raw/${pasteId}`, null);
  // }

  async sendRequest(url: string, options: any): Promise<[Error, null] | [null, Response]> {
    const logger = this.getLogger();

    try {
      const reqDescription = `${options.method} ${url} ${JSON.stringify(options.body)}`;
      logger.debug(`Req => ${reqDescription} ...`);
      const response = await this.fetch(url, options);
      logger.debug(`Res => ${reqDescription} => ${response.status} (${response.statusText})`);
      return [null, response];
    } catch (err) {
      return [err as Error, null];
    }
  }

  private async fetch(url: string, options: any): Promise<Response> {
    return await fetch(url, options);
  }

  private getLogger(): Logger {
    return AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("PastebinService");
  }
}
