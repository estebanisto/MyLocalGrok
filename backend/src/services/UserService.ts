import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import db from '../infrastructure/db/Database';

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'team_lead' | 'employee';
  createdAt: string;
}

export class UserService {
  public static async isSetupRequired(): Promise<boolean> {
    const row = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    return row.count === 0;
  }

  public static async createUser(username: string, passwordPlain: string, role: 'admin' | 'team_lead' | 'employee'): Promise<User> {
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(passwordPlain, 10);
    const createdAt = new Date().toISOString();

    const stmt = db.prepare('INSERT INTO users (id, username, password_hash, role, createdAt) VALUES (?, ?, ?, ?, ?)');
    stmt.run(id, username, passwordHash, role, createdAt);

    return { id, username, role, createdAt };
  }

  public static async verifyUser(username: string, passwordPlain: string): Promise<User | null> {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as (User & { password_hash: string });
    if (!user) return null;

    const match = await bcrypt.compare(passwordPlain, user.password_hash);
    if (!match) return null;

    const { password_hash, ...safeUser } = user;
    return safeUser;
  }

  public static deleteUser(id: string): void {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User;
    if (!user) throw new Error('User not found');
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
  }

  public static async updateUser(id: string, updates: { username?: string, role?: string, passwordPlain?: string }): Promise<User> {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User;
    if (!user) throw new Error('User not found');

    const username = updates.username || user.username;
    const role = updates.role || user.role;

    if (updates.passwordPlain) {
      const passwordHash = await bcrypt.hash(updates.passwordPlain, 10);
      db.prepare('UPDATE users SET username = ?, role = ?, password_hash = ? WHERE id = ?')
        .run(username, role, passwordHash, id);
    } else {
      db.prepare('UPDATE users SET username = ?, role = ? WHERE id = ?')
        .run(username, role, id);
    }

    const { password_hash, ...safeUser } = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    return safeUser;
  }

  public static getUserById(id: string): User | null {
    const user = db.prepare('SELECT id, username, role, createdAt FROM users WHERE id = ?').get(id) as any;
    return user ? user : null;
  }

  public static getAllUsers(): User[] {
    return db.prepare('SELECT id, username, role, createdAt FROM users').all() as User[];
  }
}
