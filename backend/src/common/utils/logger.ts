import fs from "fs";
import path from "path";

const isProduction = process.env.NODE_ENV === "production";

const LOG_DIR = path.join(process.cwd(), "logs");
if (!isProduction && !fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function getVietnamTime() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const hash: Record<string, string> = {};
  parts.forEach((p) => { hash[p.type] = p.value; });

  const fullDateTime = `${hash.year}-${hash.month}-${hash.day} ${hash.hour}:${hash.minute}:${hash.second}`;
  const dateOnly = `${hash.year}-${hash.month}-${hash.day}`;

  return { fullDateTime, dateOnly };
}

function writeLog(level: "INFO" | "WARN" | "ERROR", actor: string, message: string) {
  const { fullDateTime, dateOnly } = getVietnamTime();
  const logLine = `[${fullDateTime}] [${level}] [${actor}] ${message}`;

  if (isProduction) {
    if (level === "ERROR") console.error(logLine);
    else console.log(logLine);
    return;
  }

  const filePath = path.join(LOG_DIR, `logs-${dateOnly}.txt`);
  fs.appendFile(filePath, logLine + "\n", "utf8", (err) => {
    if (err) console.error("❌ Không thể ghi file log:", err);
  });
  console.log(logLine);
}

export const logger = {
  info: (actor: string, message: string) => writeLog("INFO", actor, message),
  warn: (actor: string, message: string) => writeLog("WARN", actor, message),
  error: (actor: string, message: string) => writeLog("ERROR", actor, message),
};