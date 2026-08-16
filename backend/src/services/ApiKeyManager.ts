import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

export type KeyStatus = 'active' | 'rate_limited' | 'exhausted';

export interface ApiKeyEntry {
  id: string;
  key: string;
  status: KeyStatus;
  errorCount: number;
  retryAfter?: number; // timestamp
}

export class ApiKeyManager extends EventEmitter {
  private keys: ApiKeyEntry[] = [];
  private currentIndex = 0;
  private readonly configPath: string;

  constructor() {
    super();
    this.configPath = path.join(process.cwd(), 'workspace', 'apiKeys.json');
    this.loadKeysFromDisk();
  }

  private loadKeysFromDisk() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        this.keys = JSON.parse(data);
      }
    } catch (e) {
      console.error("Failed to load API keys from disk", e);
    }
  }

  private saveKeysToDisk() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.keys, null, 2));
    } catch (e) {
      console.error("Failed to save API keys to disk", e);
    }
  }

  public addKey(key: string): void {
    if (!this.keys.find(k => k.key === key)) {
      this.keys.push({
        id: Math.random().toString(36).substring(7),
        key,
        status: 'active',
        errorCount: 0
      });
      this.saveKeysToDisk();
      this.emit('keysUpdated', this.getPublicKeys());
    }
  }

  public removeKey(id: string): void {
    this.keys = this.keys.filter(k => k.id !== id);
    this.saveKeysToDisk();
    this.emit('keysUpdated', this.getPublicKeys());
  }

  public getPublicKeys() {
    return this.keys.map(k => ({
      id: k.id,
      keyMasked: k.key.substring(0, 8) + '...',
      status: k.status,
      errorCount: k.errorCount
    }));
  }

  public getNextActiveKey(): string | null {
    const now = Date.now();
    let hasChanges = false;
    // Reactivate rate_limited keys if time has passed
    this.keys.forEach(k => {
      if (k.status === 'rate_limited' && k.retryAfter && now > k.retryAfter) {
        k.status = 'active';
        k.retryAfter = undefined;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.saveKeysToDisk();
      this.emit('keysUpdated', this.getPublicKeys());
    }

    const activeKeys = this.keys.filter(k => k.status === 'active');
    if (activeKeys.length === 0) {
      this.emit('alert:keys_exhausted');
      return null;
    }

    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    let attempts = 0;
    while (this.keys[this.currentIndex].status !== 'active' && attempts < this.keys.length) {
      this.currentIndex = (this.currentIndex + 1) % this.keys.length;
      attempts++;
    }

    return this.keys[this.currentIndex].key;
  }

  public reportError(key: string, statusCode: number): void {
    const entry = this.keys.find(k => k.key === key);
    if (!entry) return;

    entry.errorCount++;

    if (statusCode === 429) {
      entry.status = 'rate_limited';
      entry.retryAfter = Date.now() + 60 * 1000; // 1 minute penalty
      this.saveKeysToDisk();
      this.emit('keysUpdated', this.getPublicKeys());
    } else if (statusCode === 403 || statusCode === 401) {
      entry.status = 'exhausted';
      this.saveKeysToDisk();
      this.emit('keysUpdated', this.getPublicKeys());
    }
  }
}
