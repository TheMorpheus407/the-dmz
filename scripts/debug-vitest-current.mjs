import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const WORKSPACE_PREFIXES = [
  { prefix: 'apps/api/', filter: '@the-dmz/api' },
  { prefix: 'apps/web/', filter: '@the-dmz/web' },
  { prefix: 'packages/shared/', filter: '@the-dmz/shared' },
];

export const normalizeRelativeFile = (relativeFile) =>
  String(relativeFile ?? '')
    .trim()
    .replaceAll('\\', '/')
    .replace(/^\.\//, '');

export const resolveVitestWorkspace = (relativeFile) => {
  const normalized = normalizeRelativeFile(relativeFile);

  for (const workspace of WORKSPACE_PREFIXES) {
    if (!normalized.startsWith(workspace.prefix)) {
      continue;
    }

    const fileInWorkspace = normalized.slice(workspace.prefix.length);
    if (!fileInWorkspace) {
      break;
    }

    return {
      filter: workspace.filter,
      fileInWorkspace,
      normalizedFile: normalized,
    };
  }

  throw new Error(
    `Unsupported test file path "${normalized}". Open a test under apps/api, apps/web, or packages/shared.`,
  );
};

export const buildVitestCommand = (relativeFile) => {
  const { filter, fileInWorkspace } = resolveVitestWorkspace(relativeFile);

  return {
    command: 'pnpm',
    args: [
      '--filter',
      filter,
      'exec',
      'vitest',
      'run',
      fileInWorkspace,
      '--inspect-brk',
      '--no-file-parallelism',
    ],
  };
};

export const runVitestDebugForFile = (relativeFile) =>
  new Promise((resolve, reject) => {
    const { command, args } = buildVitestCommand(relativeFile);
    const child = spawn(command, args, { stdio: 'inherit' });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`Vitest debug command terminated by signal ${signal}`));
        return;
      }

      resolve(code ?? 0);
    });
  });

const isMainModule =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMainModule) {
  const relativeFile = process.argv[2];

  if (!relativeFile) {
    console.error('Usage: node scripts/debug-vitest-current.mjs <relative-test-file-path>');
    process.exit(1);
  }

  runVitestDebugForFile(relativeFile)
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
