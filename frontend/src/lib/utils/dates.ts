import { format, formatDistanceToNow, isToday, isTomorrow, parseISO } from "date-fns";

export function formatDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEE, d MMM yyyy");
}

export function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(":");
  const h = parseInt(hours);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

export function formatDateTime(dateStr: string, timeStr: string): string {
  return `${formatDate(dateStr)} at ${formatTime(timeStr)}`;
}

export function formatGameSchedule(dateStr: string, startTime: string, endTime?: string | null): string {
  const dateLabel = formatDate(dateStr);
  const start = formatTime(startTime);
  if (endTime) return `${dateLabel} from ${start} till ${formatTime(endTime)}`;
  return `${dateLabel} at ${start}`;
}

export function formatRelative(dateStr: string): string {
  return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
}

export function formatMonthYear(dateStr: string): string {
  return format(parseISO(dateStr), "MMMM yyyy");
}

export function toDateInputValue(dateStr: string): string {
  return dateStr;
}

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}
