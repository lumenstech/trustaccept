/**
 * Serialised async write queue for the Prisma-backed store.
 *
 * Service code today mutates an in-memory Map synchronously
 * (`getStore().riskRecords.set(...)`). In Prisma mode every mutation
 * also has to land in Postgres. We can't make the service call site
 * async without changing every route handler, so the Prisma store
 * intercepts each mutation, snapshots the state, and enqueues a
 * Postgres write. The queue runs in the background, serialising
 * writes per process so audit log ordering and last-write-wins
 * semantics match the in-memory store.
 *
 * Tests can `await flushPrismaWrites()` to guarantee every queued
 * write has hit Postgres before they assert.
 */

type Task = () => Promise<void>;

class WriteQueue {
  private queue: Task[] = [];
  private active = false;
  private errors: unknown[] = [];
  private drainWaiters: Array<{ resolve: () => void; reject: (err: unknown) => void }> = [];

  enqueue(task: Task): void {
    this.queue.push(task);
    void this.drain();
  }

  private async drain(): Promise<void> {
    if (this.active) return;
    this.active = true;
    try {
      while (this.queue.length > 0) {
        const next = this.queue.shift()!;
        try {
          await next();
        } catch (err) {
          this.errors.push(err);
          // eslint-disable-next-line no-console
          console.error("[trustaccept:writeQueue] task failed:", err);
        }
      }
    } finally {
      this.active = false;
      const waiters = this.drainWaiters;
      this.drainWaiters = [];
      const errors = this.errors;
      this.errors = [];
      if (errors.length > 0) {
        const first = errors[0];
        for (const w of waiters) w.reject(first);
      } else {
        for (const w of waiters) w.resolve();
      }
    }
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0 && !this.active) return;
    await new Promise<void>((resolve, reject) => {
      this.drainWaiters.push({ resolve, reject });
    });
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __TRUSTACCEPT_WRITE_QUEUE__: WriteQueue | undefined;
}

function queue(): WriteQueue {
  if (!globalThis.__TRUSTACCEPT_WRITE_QUEUE__) {
    globalThis.__TRUSTACCEPT_WRITE_QUEUE__ = new WriteQueue();
  }
  return globalThis.__TRUSTACCEPT_WRITE_QUEUE__;
}

export function enqueuePrismaWrite(task: Task): void {
  queue().enqueue(task);
}

export function flushPrismaWrites(): Promise<void> {
  return queue().flush();
}

export function __resetWriteQueueForTests(): void {
  globalThis.__TRUSTACCEPT_WRITE_QUEUE__ = new WriteQueue();
}
