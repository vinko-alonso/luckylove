type LogLevel = 'info' | 'warn' | 'error';

type LogPayload = {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: unknown;
};

function log({ level, message, context, error }: LogPayload) {
  if (!__DEV__) {
    return;
  }

  const meta = context ? { context } : undefined;

  if (level === 'error') {
    console.error(message, error ?? '', meta ?? '');
    return;
  }

  if (level === 'warn') {
    console.warn(message, meta ?? '');
    return;
  }

  console.log(message, meta ?? '');
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) =>
    log({ level: 'info', message, context }),
  warn: (message: string, context?: Record<string, unknown>) =>
    log({ level: 'warn', message, context }),
  error: (message: string, error?: unknown, context?: Record<string, unknown>) =>
    log({ level: 'error', message, error, context }),
};
