// Shared helpers for the tenant provisioning CLI (control-plane).
// The registry (tenants/registry.json) is the source of truth for the
// fleet: every script iterates it, never hardcoded project ids.

import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const REGISTRY_PATH = path.join(ROOT, 'tenants', 'registry.json');

export function readRegistry() {
  return JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
}

export function writeRegistry(registry) {
  writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + '\n');
}

export function activeTenants() {
  return readRegistry().tenants.filter((t) => t.status === 'active');
}

export function findTenant(slug) {
  return readRegistry().tenants.find((t) => t.slug === slug);
}

/** Runs a shell command, streaming output. Throws on failure. */
export function sh(cmd, { dryRun = false, allowFail = false } = {}) {
  if (dryRun) {
    console.log(`  [dry-run] ${cmd}`);
    return '';
  }
  console.log(`  $ ${cmd}`);
  try {
    return execSync(cmd, { cwd: ROOT, stdio: ['inherit', 'pipe', 'inherit'] })
      .toString()
      .trim();
  } catch (error) {
    if (allowFail) {
      console.warn(`  ! comanda a eșuat (continuăm): ${error.message?.split('\n')[0]}`);
      return '';
    }
    throw error;
  }
}

/** ex: "Comuna Filipești" -> slug validation */
export function isValidSlug(slug) {
  return /^[a-z][a-z0-9-]{2,30}$/.test(slug);
}

export function logStep(title) {
  console.log(`\n=== ${title} ===`);
}

export function logManual(text) {
  console.log(`  [MANUAL] ${text}`);
}
