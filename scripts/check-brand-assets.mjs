import { execSync } from 'node:child_process';

const BRAND_DIR_PREFIX = 'public/brand/';
const ALLOWLIST_FILE = '.logo-change-allowlist';
const COMMIT_TAG_REGEX = /\[logo-change\]/i;

function getHeadChangedFiles() {
  const output = execSync('git show --name-only --pretty=format: HEAD', { encoding: 'utf8' }).trim();
  if (!output) return [];
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function getHeadCommitMessage() {
  return execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim();
}

const changedFiles = getHeadChangedFiles();
const changedBrandAssets = changedFiles.filter((path) => path.startsWith(BRAND_DIR_PREFIX));

if (changedBrandAssets.length === 0) {
  process.exit(0);
}

const commitMessage = getHeadCommitMessage();
const hasLogoTag = COMMIT_TAG_REGEX.test(commitMessage);
const allowlistTouched = changedFiles.includes(ALLOWLIST_FILE);

if (hasLogoTag || allowlistTouched) {
  process.exit(0);
}

console.error('❌ Brand asset guard failed.');
console.error('Files changed under public/brand/:');
for (const file of changedBrandAssets) {
  console.error(`  - ${file}`);
}
console.error(`Add [logo-change] to the commit message OR modify ${ALLOWLIST_FILE} in the same commit.`);
process.exit(1);
