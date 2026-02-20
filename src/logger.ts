/**
 * Lightweight structured JSON logger inspired by Pino.
 */

type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

interface LogPayload {
  msg: string;
  level: LogLevel;
  time: string;
  [key: string]: unknown;
}

class Logger {
  private service: string;

  constructor(service: string) {
    this.service = service;
  }

  private log(
    level: LogLevel,
    msg: string,
    context: Record<string, unknown> = {},
  ) {
    // Redact potential sensitive data patterns (e.g., long hex strings or common labels)
    const sanitizedContext = this.sanitize(context);

    const payload: LogPayload = {
      level,
      msg,
      time: new Date().toISOString(),
      service: this.service,
      ...sanitizedContext,
    };

    console.log(JSON.stringify(payload));
  }

  private sanitize(context: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...context };
    for (const key in sanitized) {
      if (typeof sanitized[key] === "string") {
        const val = sanitized[key] as string;
        // Basic redaction for anything that looks like a token or secret
        if (val.length > 50 || /token|secret|password|key/i.test(key)) {
          sanitized[key] = "[REDACTED]";
        }
      }
    }
    return sanitized;
  }

  info(msg: string, context?: Record<string, unknown>) {
    this.log("INFO", msg, context);
  }

  warn(msg: string, context?: Record<string, unknown>) {
    this.log("WARN", msg, context);
  }

  error(msg: string, context?: Record<string, unknown>) {
    this.log("ERROR", msg, context);
  }

  debug(msg: string, context?: Record<string, unknown>) {
    this.log("DEBUG", msg, context);
  }
}

export const logger = new Logger("tms-captcha");
