import { AUTH_MOCK_ENABLED } from '../config/api.config';

export function isDemoMode(): boolean {
  return AUTH_MOCK_ENABLED;
}
