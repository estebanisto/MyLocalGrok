import fs from 'fs/promises';
import path from 'path';

export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

export class WorkspaceSandbox {
  private readonly workspaceRoot: string;
  private readonly archivesRoot: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = path.resolve(workspaceRoot);
    this.archivesRoot = path.join(this.workspaceRoot, '.archives');
  }

  /**
   * Resolves a path safely, throwing a SecurityError if it attempts to escape the workspace.
   */
  public resolveSafePath(relativePath: string): string {
    const resolvedPath = path.resolve(this.workspaceRoot, relativePath);
    if (!resolvedPath.startsWith(this.workspaceRoot)) {
      throw new SecurityError(`Path traversal attempt detected: ${relativePath}`);
    }
    return resolvedPath;
  }

  /**
   * Reads a file from the workspace safely.
   */
  public async readFile(relativePath: string): Promise<string> {
    const safePath = this.resolveSafePath(relativePath);
    return fs.readFile(safePath, 'utf-8');
  }

  /**
   * Writes a file to the workspace safely.
   */
  public async writeFile(relativePath: string, content: string): Promise<void> {
    const safePath = this.resolveSafePath(relativePath);
    const dir = path.dirname(safePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(safePath, content, 'utf-8');
  }

  /**
   * Soft deletes a file by moving it to the .archives directory with a timestamp.
   */
  public async softDelete(relativePath: string): Promise<void> {
    const safePath = this.resolveSafePath(relativePath);
    
    try {
      await fs.access(safePath);
    } catch {
      throw new Error(`File not found: ${relativePath}`);
    }

    const basename = path.basename(safePath);
    const timestamp = Date.now();
    const archiveName = `${timestamp}_${basename}`;
    const archivePath = path.join(this.archivesRoot, archiveName);

    // Move file
    await fs.mkdir(this.archivesRoot, { recursive: true });
    await fs.rename(safePath, archivePath);

    // Optional: Log metadata
    const metadataPath = path.join(this.archivesRoot, `${archiveName}.meta.json`);
    await fs.writeFile(metadataPath, JSON.stringify({
      originalPath: relativePath,
      deletedAt: new Date().toISOString(),
      timestamp
    }, null, 2));
  }
}
