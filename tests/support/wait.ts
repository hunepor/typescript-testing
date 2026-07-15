export async function waitFor<T>(
  operation: () => Promise<T | null | undefined>,
  options: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 15_000;
  const intervalMs = options.intervalMs ?? 250;
  const deadline = Date.now() + timeoutMs;

  let lastValue: T | null | undefined;
  while (Date.now() < deadline) {
    lastValue = await operation();
    if (lastValue) {
      return lastValue;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Condition was not met within ${timeoutMs}ms. Last value: ${String(lastValue)}`);
}
