import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

export type StoredUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
};

export type SessionUser = {
  id: string;
  name: string;
  email: string;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const USERS_FILE = path.join(DATA_DIR, "lovora-users.json");

export const SESSION_COOKIE = "lovora_session";

async function ensureUsersFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(USERS_FILE);
  } catch {
    await fs.writeFile(USERS_FILE, "[]", "utf8");
  }
}

export async function readUsers(): Promise<StoredUser[]> {
  await ensureUsersFile();
  const raw = await fs.readFile(USERS_FILE, "utf8");

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeUsers(users: StoredUser[]) {
  await ensureUsersFile();
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

export function createSalt() {
  return crypto.randomBytes(16).toString("hex");
}

export function hashPassword(password: string, salt: string) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
}

export function createSessionValue(user: SessionUser) {
  return Buffer.from(JSON.stringify(user), "utf8").toString("base64url");
}

export function readSessionValue(raw: string | undefined): SessionUser | null {
  if (!raw) return null;

  try {
    const decoded = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as Partial<SessionUser>;

    if (!parsed.id || !parsed.email || !parsed.name) return null;

    return {
      id: parsed.id,
      name: parsed.name,
      email: parsed.email,
    };
  } catch {
    return null;
  }
}
