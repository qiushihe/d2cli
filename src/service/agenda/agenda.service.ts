import { v4 as uuidV4 } from "uuid";

import { AppModule } from "~src/module/app.module";
import { SessionService } from "~src/service/session/session.service";
import { SessionDataName } from "~src/service/session/session.types";

import { AgendaItems } from "./agenda.types";
import { AgendaItem } from "./agenda.types";
import { CreateItemOptions } from "./agenda.types";

export class AgendaService {
  private readonly sessionService: SessionService;

  constructor() {
    this.sessionService = AppModule.getDefaultInstance().resolve<SessionService>("SessionService");
  }

  async getAllItems(sessionId: string): Promise<[Error, null] | [null, AgendaItem[]]> {
    const [readErr, events] = await this.sessionService.getData<AgendaItems>(
      sessionId,
      SessionDataName.AgendaItems
    );
    if (readErr) {
      return [readErr, null];
    }

    return [null, events ? Object.values(events) : []];
  }

  async createItem(
    sessionId: string,
    options: CreateItemOptions
  ): Promise<[Error, null] | [null, AgendaItem]> {
    const [readErr, events] = await this.sessionService.getData<AgendaItems>(
      sessionId,
      SessionDataName.AgendaItems
    );
    if (readErr) {
      return [readErr, null];
    }

    const allEvents = events || {};

    const evt: AgendaItem = { id: uuidV4(), title: options.title };

    allEvents[evt.id] = evt;

    const writeErr = await this.sessionService.setData<AgendaItems>(
      sessionId,
      SessionDataName.AgendaItems,
      allEvents
    );
    if (writeErr) {
      return [writeErr, null];
    }

    return [null, evt];
  }

  async deleteItems(sessionId: string, eventIds: string[]): Promise<Error | null> {
    if (eventIds.length <= 0) {
      return null;
    }

    const [readErr, events] = await this.sessionService.getData<AgendaItems>(
      sessionId,
      SessionDataName.AgendaItems
    );
    if (readErr) {
      return readErr;
    }

    const allEvents = events || {};
    eventIds.forEach((eventId) => delete allEvents[eventId]);

    const writeErr = await this.sessionService.setData<AgendaItems>(
      sessionId,
      SessionDataName.AgendaItems,
      allEvents
    );
    if (writeErr) {
      return writeErr;
    }

    return null;
  }
}
