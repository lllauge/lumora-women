export function cleanUsdaApiKey(value: string | undefined) {
  return String(value ?? '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim()
}

export function getUsdaApiKey() {
  const fdcKey = cleanUsdaApiKey(process.env.USDA_FDC_API_KEY)
  if (fdcKey) {
    return {
      key: fdcKey,
      source: 'USDA_FDC_API_KEY',
      fingerprint: `length ${fdcKey.length}, ending ${fdcKey.slice(-4)}`,
    }
  }

  const legacyKey = cleanUsdaApiKey(process.env.USDA_API_KEY)
  if (legacyKey) {
    return {
      key: legacyKey,
      source: 'USDA_API_KEY',
      fingerprint: `length ${legacyKey.length}, ending ${legacyKey.slice(-4)}`,
    }
  }

  return {
    key: 'DEMO_KEY',
    source: 'DEMO_KEY',
    fingerprint: 'public demo key',
  }
}
