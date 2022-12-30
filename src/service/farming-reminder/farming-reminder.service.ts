import { AppModule } from "~src/module/app.module";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";
import { SessionService } from "~src/service/session/session.service";
import { SessionDataName } from "~src/service/session/session.types";

import { FarmingReminder, FarmingReminderSessionData } from "./farming-reminder.types";

export class FarmingReminderService {
  private readonly logger: Logger;
  private readonly sessionService: SessionService;

  constructor() {
    this.logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("FarmingReminderService");

    this.sessionService = AppModule.getDefaultInstance().resolve<SessionService>("SessionService");
  }

  async getReminders(sessionId: string): Promise<[Error, null] | [null, FarmingReminder[]]> {
    const [dataErr, data] = await this.sessionService.getData<FarmingReminderSessionData>(
      sessionId,
      SessionDataName.FarmingReminder
    );
    if (dataErr) {
      return [dataErr, null];
    }

    return [null, data?.reminders || []];
  }

  async addReminder(
    sessionId: string,
    reminder: FarmingReminder
  ): Promise<[Error, null] | [null, FarmingReminder]> {
    const [getDataErr, data] = await this.sessionService.getData<FarmingReminderSessionData>(
      sessionId,
      SessionDataName.FarmingReminder
    );
    if (getDataErr) {
      return [getDataErr, null];
    }

    const sessionData: FarmingReminderSessionData = data || {};
    sessionData.reminders = data?.reminders || [];
    sessionData.reminders.push(reminder);

    const setDataErr = await this.sessionService.setData(
      sessionId,
      SessionDataName.FarmingReminder,
      sessionData
    );
    if (setDataErr) {
      return [setDataErr, null];
    }

    return [null, reminder];
  }

  async removeReminder(
    sessionId: string,
    reminderId: string
  ): Promise<[Error, null] | [null, FarmingReminder]> {
    const [getDataErr, data] = await this.sessionService.getData<FarmingReminderSessionData>(
      sessionId,
      SessionDataName.FarmingReminder
    );
    if (getDataErr) {
      return [getDataErr, null];
    }

    let removedReminder: FarmingReminder | null = null;
    const sessionData: FarmingReminderSessionData = data || {};
    sessionData.reminders = (data?.reminders || []).filter((reminder) => {
      if (reminder.id === reminderId) {
        removedReminder = reminder;
        return false;
      } else {
        return true;
      }
    });

    if (!removedReminder) {
      return [new Error(`Reminder not found with ID: ${reminderId}`), null];
    } else {
      const setDataErr = await this.sessionService.setData(
        sessionId,
        SessionDataName.FarmingReminder,
        sessionData
      );
      if (setDataErr) {
        return [setDataErr, null];
      }

      return [null, removedReminder];
    }
  }
}
