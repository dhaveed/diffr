import * as core from '@actions/core';
import type { LogLevel } from '../types.js';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const SECRET_KEYS = ['token', 'key', 'secret', 'password', 'authorization'];

export class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  debug(message: string, meta?: Record<string, unknown>) {
    if (!this.shouldLog('debug')) return;
    const safe = meta ? this.redactMeta(meta) : undefined;
    core.debug(this.format(message, safe));
  }

  info(message: string, meta?: Record<string, unknown>) {
    if (!this.shouldLog('info')) return;
    const safe = meta ? this.redactMeta(meta) : undefined;
    core.info(this.format(message, safe));
  }

  warn(message: string, meta?: Record<string, unknown>) {
    if (!this.shouldLog('warn')) return;
    const safe = meta ? this.redactMeta(meta) : undefined;
    core.warning(this.format(message, safe));
  }

  error(message: string, meta?: Record<string, unknown>) {
    if (!this.shouldLog('error')) return;
    const safe = meta ? this.redactMeta(meta) : undefined;
    core.error(this.format(message, safe));
  }

  maskSecret(value: string) {
    if (value) {
      core.setSecret(value);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_ORDER[level] >= LEVEL_ORDER[this.level];
  }

  private format(message: string, meta?: Record<string, unknown>): string {
    if (!meta || Object.keys(meta).length === 0) return message;
    return `${message} ${JSON.stringify(meta)}`;
  }

  private redactMeta(meta: Record<string, unknown>): Record<string, unknown> {
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(meta)) {
      if (SECRET_KEYS.some((s) => key.toLowerCase().includes(s))) {
        redacted[key] = '***';
      } else {
        redacted[key] = value;
      }
    }
    return redacted;
  }
}
