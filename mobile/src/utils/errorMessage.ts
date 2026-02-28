interface ApiErrorShape {
  response?: {
    data?: {
      detail?: unknown;
      message?: unknown;
    };
  };
  message?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (!isRecord(error)) {
    return fallback;
  }

  const typed = error as ApiErrorShape;
  const detail = typed.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim().length > 0) {
    return detail;
  }

  const message = typed.response?.data?.message;
  if (typeof message === 'string' && message.trim().length > 0) {
    return message;
  }

  if (typeof typed.message === 'string' && typed.message.trim().length > 0) {
    return typed.message;
  }

  return fallback;
}
