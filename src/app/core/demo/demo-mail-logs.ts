import { MailLogListResponseApiModel } from '../api/backend-api.model';
import { DEMO_STORAGE_KEYS, DemoPersistenceService } from './demo-persistence.service';
import { createDemoMailLogsSeed } from './demo-seed.data';

export function appendDemoMailLogs(
  demoPersistence: DemoPersistenceService,
  entries: MailLogListResponseApiModel[]
): void {
  if (!entries.length) {
    return;
  }
  const logs = demoPersistence.read(DEMO_STORAGE_KEYS.mailLogs, createDemoMailLogsSeed());
  demoPersistence.write(DEMO_STORAGE_KEYS.mailLogs, [...entries, ...logs]);
}
