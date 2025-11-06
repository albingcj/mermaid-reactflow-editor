/**
 * Logger Utility
 *
 * Provides consistent logging throughout the application.
 * Debug logs are only shown in development mode.
 * Production logs are limited to warnings and errors.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabled: boolean;
  minLevel: LogLevel;
  timestamp: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const config: LoggerConfig = {
  enabled: true,
  minLevel: import.meta.env.DEV ? 'debug' : 'warn',
  timestamp: import.meta.env.DEV,
};

function shouldLog(level: LogLevel): boolean {
  return config.enabled && LOG_LEVELS[level] >= LOG_LEVELS[config.minLevel];
}

function formatMessage(level: LogLevel, message: string): string {
  const timestamp = config.timestamp
    ? `[${new Date().toISOString().split('T')[1].split('.')[0]}]`
    : '';
  const levelTag = `[${level.toUpperCase()}]`;
  return `${timestamp}${levelTag} ${message}`.trim();
}

/**
 * Log a debug message (only in development)
 */
function debug(message: string, ...args: unknown[]): void {
  if (shouldLog('debug')) {
    console.log(formatMessage('debug', message), ...args);
  }
}

/**
 * Log an informational message
 */
function info(message: string, ...args: unknown[]): void {
  if (shouldLog('info')) {
    console.info(formatMessage('info', message), ...args);
  }
}

/**
 * Log a warning message
 */
function warn(message: string, ...args: unknown[]): void {
  if (shouldLog('warn')) {
    console.warn(formatMessage('warn', message), ...args);
  }
}

/**
 * Log an error message
 */
function error(message: string, ...args: unknown[]): void {
  if (shouldLog('error')) {
    console.error(formatMessage('error', message), ...args);
  }
}

/**
 * Configure the logger
 */
function configure(newConfig: Partial<LoggerConfig>): void {
  Object.assign(config, newConfig);
}

/**
 * Logger instance
 */
export const logger = {
  debug,
  info,
  warn,
  error,
  configure,
};

/**
 * Default export
 */
export default logger;
