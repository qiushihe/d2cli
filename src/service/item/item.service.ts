import { AppModule } from "~src/module/app.module";
import { Destiny2ComponentDataService } from "~src/service/destiny2-component-data/destiny2-component-data.service";
import { resolveItemSockets } from "~src/service/destiny2-component-data/item.resolver";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";

export class ItemService {
  private readonly destiny2ComponentDataService: Destiny2ComponentDataService;

  constructor() {
    this.destiny2ComponentDataService = AppModule.getDefaultInstance().resolve(
      Destiny2ComponentDataService
    );
  }

  async getItemEquippedPlugHashes(
    sessionId: string,
    membershipType: number,
    membershipId: string,
    itemInstanceId: string
  ): Promise<ErrorXOR<number[]>> {
    const logger = this.getLogger();

    logger.debug(`Fetching item sockets ...`);
    const [socketsComponentErr, socketsComponent] =
      await this.destiny2ComponentDataService.getItemInstanceComponentsData(
        sessionId,
        membershipType,
        membershipId,
        itemInstanceId,
        resolveItemSockets
      );
    if (socketsComponentErr) {
      return [socketsComponentErr, null];
    }

    return [null, socketsComponent.sockets.map((socket) => socket.plugHash || -1)];
  }

  private getLogger(): Logger {
    return AppModule.getDefaultInstance().resolve(LogService).getLogger("ItemService");
  }
}
