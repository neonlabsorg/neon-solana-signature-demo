export async function delay(timestamp: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), timestamp);
  });
}
