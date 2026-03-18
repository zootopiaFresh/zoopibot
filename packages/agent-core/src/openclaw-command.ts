import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function isPathLikeCommand(command: string) {
  return command.includes('/') || command.includes('\\') || command.startsWith('.');
}

export function commandExists(command: string, platform: NodeJS.Platform = process.platform) {
  if (!command.trim()) {
    return false;
  }

  if (isPathLikeCommand(command)) {
    return existsSync(path.resolve(command));
  }

  if (platform === 'win32') {
    return spawnSync('where', [command], {
      stdio: 'ignore',
      windowsHide: true,
    }).status === 0;
  }

  return (
    spawnSync('sh', ['-lc', `command -v ${shellQuote(command)} >/dev/null 2>&1`], {
      stdio: 'ignore',
    }).status === 0
  );
}
