export type StorageBackend = "memory" | "prisma";

export function storageBackend(): StorageBackend {
  return process.env.TRUSTACCEPT_STORAGE_BACKEND === "prisma" ? "prisma" : "memory";
}

export function isPrismaStorage(): boolean {
  return storageBackend() === "prisma";
}
