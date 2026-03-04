import type { LogLevel } from '../types.js';
export declare class Logger {
    private level;
    constructor(level?: LogLevel);
    debug(message: string, meta?: Record<string, unknown>): void;
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
    maskSecret(value: string): void;
    private shouldLog;
    private format;
    private redactMeta;
}
//# sourceMappingURL=logger.d.ts.map