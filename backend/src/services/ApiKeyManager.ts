import { EventEmitter } from 'events';

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

  constructor() {
    super();
  }

  public addKey(key: string): void {
    if (!this.keys.find(k => k.key === key)) {
      this.keys.push({
        id: Math.random().toString(36).substring(7),
        key,
        status: 'active',
        errorCount: 0
      });
      this.emit('keysUpdated', this.getPublicKeys());
    }
  }

  public removeKey(id: string): void {
    this.keys = this.keys.filter(k => k.id !== id);
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
    // Reactivate rate_limited keys if time has passed
    this.keys.forEach(k => {
      if (k.status === 'rate_limited' && k.retryAfter && now > k.retryAfter) {
        k.status = 'active';
        k.retryAfter = undefined;
        this.emit('keysUpdated', this.getPublicKeys());
      }
    });

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
      this.emit('keysUpdated', this.getPublicKeys());
    } else if (statusCode === 403 || statusCode === 401) {
      entry.status = 'exhausted';
      this.emit('keysUpdated', this.getPublicKeys());
    }
  }
}
