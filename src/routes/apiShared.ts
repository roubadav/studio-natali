import type { Env } from '../types';
import * as db from '../lib/db';
import { SMSService } from '../lib/sms';
import { mapSettings, getNumericSetting } from '../lib/settings';

export async function getBookingWindowDays(dbConn: Env['DB']) {
  return getNumericSetting(dbConn, 'booking_window', 30);
}

export async function getRetentionDays(dbConn: Env['DB']) {
  return getNumericSetting(dbConn, 'data_retention_days', 1095);
}

export async function createSMSService(dbConn: D1Database, env: Env) {
  const settings = await db.getAllSettings(dbConn);
  const settingsMap = mapSettings(settings);
  return new SMSService(dbConn, settingsMap, env);
}