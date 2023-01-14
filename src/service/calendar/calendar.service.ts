import * as RR from "rrule";
import { v4 as uuidV4 } from "uuid";

import { AppModule } from "~src/module/app.module";
import { SessionService } from "~src/service/session/session.service";
import { SessionDataName } from "~src/service/session/session.types";

import { CalendarEvents } from "./calendar.types";
import { CalendarEvent } from "./calendar.types";

export class CalendarService {
  private readonly sessionService: SessionService;

  constructor() {
    this.sessionService = AppModule.getDefaultInstance().resolve<SessionService>("SessionService");
  }

  async getAllEvents(sessionId: string): Promise<[Error, null] | [null, CalendarEvent[]]> {
    const [readErr, events] = await this.sessionService.getData<CalendarEvents>(
      sessionId,
      SessionDataName.CalendarEvents
    );
    if (readErr) {
      return [readErr, null];
    }

    return [null, events ? Object.values(events) : []];
  }

  async createEventFromString(
    sessionId: string,
    title: string,
    options: string
  ): Promise<[Error, null] | [null, CalendarEvent]> {
    const [readErr, events] = await this.sessionService.getData<CalendarEvents>(
      sessionId,
      SessionDataName.CalendarEvents
    );
    if (readErr) {
      return [readErr, null];
    }

    const allEvents = events || {};

    const rrule = RR.RRule.fromString(options);

    const evt: CalendarEvent = {
      id: uuidV4(),
      title,
      rfcString: RR.RRule.optionsToString(rrule.options)
    };

    allEvents[evt.id] = evt;

    const writeErr = await this.sessionService.setData<CalendarEvents>(
      sessionId,
      SessionDataName.CalendarEvents,
      allEvents
    );
    if (writeErr) {
      return [writeErr, null];
    }

    return [null, evt];
  }

  async deleteEvent(sessionId: string, eventId: string): Promise<Error | null> {
    const [readErr, events] = await this.sessionService.getData<CalendarEvents>(
      sessionId,
      SessionDataName.CalendarEvents
    );
    if (readErr) {
      return readErr;
    }

    const allEvents = events || {};
    delete allEvents[eventId];

    const writeErr = await this.sessionService.setData<CalendarEvents>(
      sessionId,
      SessionDataName.CalendarEvents,
      allEvents
    );
    if (writeErr) {
      return writeErr;
    }

    return null;
  }
}
