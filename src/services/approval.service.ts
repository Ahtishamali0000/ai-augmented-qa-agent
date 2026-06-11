import { copyFile, mkdir, stat } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

export class ApprovalService {
  constructor(private readonly rootDir = process.cwd()) {}

  async approvePendingTest(fileName: string, targetFolder: string) {
    const safeFileName = basename(fileName);
    const safeTargetFolder = this.validateTargetFolder(targetFolder);
    const pendingPath = join(this.rootDir, 'generated-tests', 'pending', safeFileName);
    const finalPath = join(this.rootDir, 'tests', 'e2e', safeTargetFolder, safeFileName);

    await stat(pendingPath);
    await mkdir(dirname(finalPath), { recursive: true });
    await copyFile(pendingPath, finalPath);

    return {
      approved: true,
      pendingPath,
      finalPath,
    };
  }

  private validateTargetFolder(targetFolder: string) {
    const allowedFolders = new Set(['smoke', 'auth', 'search', 'cart', 'checkout']);

    if (!allowedFolders.has(targetFolder)) {
      throw new Error(`Unsupported target folder: ${targetFolder}`);
    }

    return targetFolder;
  }
}
