export type BackupInfo = { filename: string; path: string; size: number; createdAt: Date };
export function createDatabaseBackup(options?: { source?: string; directory?: string; now?: Date }): Promise<BackupInfo>;
export function listDatabaseBackups(limit?: number): Promise<Omit<BackupInfo, "path">[]>;
