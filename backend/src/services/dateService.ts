import { appTimezone } from "../config.js";
export function schoolDate(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: appTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => parts.find((p) => p.type === type)!.value;
  return new Date(
    `${value("year")}-${value("month")}-${value("day")}T00:00:00.000Z`,
  );
}
