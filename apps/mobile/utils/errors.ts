function readMessage(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value;

  if (Array.isArray(value)) {
    const messages = value
      .map(readMessage)
      .filter((message): message is string => Boolean(message));
    return messages.length ? messages.join("\n") : undefined;
  }

  if (value && typeof value === "object" && "message" in value) {
    return readMessage((value as { message?: unknown }).message);
  }

  return undefined;
}

export function getApiErrorMessage(error: any, fallback: string) {
  const message = readMessage(error?.response?.data?.message);
  if (message) return message;

  if (!error?.response) {
    return "Cannot reach the Find Am server. Check that the API is running and your phone can reach your computer.";
  }

  return fallback;
}
