export function parseLocalDate(dateStr: string): Date | null {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isWithinBookingWindow(dateStr: string, bookingWindowDays: number): boolean {
  const requested = parseLocalDate(dateStr);
  if (!requested) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + bookingWindowDays);
  maxDate.setHours(23, 59, 59, 999);
  return requested >= today && requested <= maxDate;
}