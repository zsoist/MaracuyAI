#!/usr/bin/env node

const profile = String(process.env.EAS_BUILD_PROFILE || '').toLowerCase();
const ci = String(process.env.CI || '').toLowerCase() === 'true';
const force = String(process.env.VALIDATE_RELEASE_ENV || '').toLowerCase() === 'true';
const shouldValidate = force || ci || ['preview', 'production', 'release'].includes(profile);

if (!shouldValidate) {
  console.log('[release-env] skipping validation (non-release context).');
  process.exit(0);
}

const value = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
if (!value) {
  console.error('[release-env] EXPO_PUBLIC_API_BASE_URL is required for release builds.');
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(value);
} catch {
  console.error('[release-env] EXPO_PUBLIC_API_BASE_URL must be a valid absolute URL.');
  process.exit(1);
}

const host = parsed.hostname.toLowerCase();
const invalidHosts = new Set(['localhost', '127.0.0.1', '10.0.2.2']);
if (invalidHosts.has(host)) {
  console.error('[release-env] EXPO_PUBLIC_API_BASE_URL cannot use localhost/loopback in release builds.');
  process.exit(1);
}

if (!parsed.pathname.startsWith('/api/v1')) {
  console.error('[release-env] EXPO_PUBLIC_API_BASE_URL should include /api/v1 path.');
  process.exit(1);
}

console.log(`[release-env] ok for profile=${profile || 'unknown'} host=${host}`);
