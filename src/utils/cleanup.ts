import { log } from './logger';

/**
 * Tracks disposable resources created during a test and releases them in reverse order.
 * Ensures cleanup runs even on failure paths; individual cleanup errors are logged, not thrown.
 */
export class CleanupRegistry {
  private tasks: Array<{ name: string; fn: () => Promise<void> }> = [];

  register(name: string, fn: () => Promise<void>): void {
    this.tasks.push({ name, fn });
  }

  async runAll(): Promise<{ succeeded: string[]; failed: Array<{ name: string; error: string }> }> {
    const succeeded: string[] = [];
    const failed: Array<{ name: string; error: string }> = [];
    for (const t of [...this.tasks].reverse()) {
      try {
        await t.fn();
        succeeded.push(t.name);
      } catch (e) {
        failed.push({ name: t.name, error: (e as Error).message });
        log.warn(`[cleanup] ${t.name} failed: ${(e as Error).message}`);
      }
    }
    this.tasks = [];
    return { succeeded, failed };
  }
}
