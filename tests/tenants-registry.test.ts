import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// The tenant registry is the source of truth for the whole fleet -
// every provisioning/ops script iterates it. A malformed entry would
// break fleet-wide rules deploys and health checks, so CI validates it.

const registry = JSON.parse(
  readFileSync(path.resolve(__dirname, '../tenants/registry.json'), 'utf8')
);

const VALID_STATUS = ['provisioning', 'active', 'suspended'];

describe('tenants/registry.json', () => {
  it('has at least the first tenant', () => {
    expect(registry.tenants.length).toBeGreaterThanOrEqual(1);
  });

  it('has unique slugs, project ids and domains', () => {
    const slugs = registry.tenants.map((t: any) => t.slug);
    const projects = registry.tenants.map((t: any) => t.firebaseProjectId);
    const domains = registry.tenants.map((t: any) => t.productionDomain);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(projects).size).toBe(projects.length);
    expect(new Set(domains).size).toBe(domains.length);
  });

  for (const tenant of registry.tenants as any[]) {
    it(`tenant ${tenant.slug} is fully described`, () => {
      expect(tenant.slug).toMatch(/^[a-z][a-z0-9-]{2,30}$/);
      expect(tenant.numeComuna).toBeTruthy();
      expect(tenant.numePrimarie).toBeTruthy();
      expect(tenant.antetOficial).toBeTruthy();
      expect(tenant.judet).toBeTruthy();
      expect(tenant.firebaseProjectId).toMatch(/^[a-z][a-z0-9-]+$/);
      expect(tenant.productionDomain).toMatch(/^[a-z0-9.-]+\.[a-z]+$/);
      expect(VALID_STATUS).toContain(tenant.status);
    });
  }
});
