import type { Setting } from '../types';
import * as db from './db';

export function mapSettings(settingsArray: Setting[]): Record<string, string> {
  return settingsArray.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {} as Record<string, string>);
}

export async function getNumericSetting(dbConn: D1Database, key: string, fallback: number): Promise<number> {
  const settings = await db.getAllSettings(dbConn);
  const value = settings.find(s => s.key === key)?.value;
  const parsed = parseInt(value || String(fallback), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}