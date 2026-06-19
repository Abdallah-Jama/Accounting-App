const { constants } = require("node:fs");
const { copyFile, mkdir, readdir, stat } = require("node:fs/promises");
const path = require("node:path");

function databasePath() {
  const configured = process.env.DATABASE_URL || "file:./accounting.db";
  if (!configured.startsWith("file:")) throw new Error("Backups require a local SQLite file.");
  const relative = configured.slice(5);
  return path.resolve(process.cwd(), "prisma", relative);
}

function timestamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace("T", "-").replace("Z", "").replace(".", "-");
}

async function createDatabaseBackup(options = {}) {
  const source = options.source || databasePath();
  const directory = options.directory || path.resolve(process.cwd(), "backups");
  await mkdir(directory, { recursive: true });
  const filename = `accounting-backup-${timestamp(options.now)}.db`;
  const destination = path.join(directory, filename);
  await copyFile(source, destination, constants.COPYFILE_EXCL);
  const details = await stat(destination);
  return { filename, path: destination, size: details.size, createdAt: details.birthtime };
}

async function listDatabaseBackups(limit = 10) {
  const directory = path.resolve(process.cwd(), "backups");
  try {
    const names = (await readdir(directory)).filter((name) => /^accounting-backup-.*\.db$/.test(name));
    const files = await Promise.all(names.map(async (filename) => {
      const details = await stat(path.join(directory, filename));
      return { filename, size: details.size, createdAt: details.birthtime };
    }));
    return files.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
  } catch (error) {
    if (error && error.code === "ENOENT") return [];
    throw error;
  }
}

module.exports = { createDatabaseBackup, listDatabaseBackups };
