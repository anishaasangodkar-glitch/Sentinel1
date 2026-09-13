export type UrlSignals = { hostname: string; protocol: string; path: string; queryKeys: string[]; signals: string[]; trustworthyContext: boolean }

export function inspectUrl(raw: string): UrlSignals {
  try {
    const url = new URL(raw)
    const hostname = url.hostname.toLowerCase()
    const signals: string[] = []
    if (url.protocol !== 'https:') signals.push('Connection is not HTTPS')
    if (hostname.includes('xn--')) signals.push('Punycode hostname')
    if (hostname.split('.').length > 3) signals.push('Unusually deep subdomain')
    if (/login|verify|secure|account|wallet|claim|reset|gift|prize/i.test(`${url.pathname}?${url.search}`)) signals.push('Credential or reward language in URL')
    if (/[?&](token|password|pass|otp|code)=/i.test(url.search)) signals.push('Sensitive-looking query parameter')
    return { hostname, protocol: url.protocol, path: url.pathname, queryKeys: [...url.searchParams.keys()], signals, trustworthyContext: signals.length === 0 && url.protocol === 'https:' }
  } catch {
    return { hostname: '', protocol: '', path: '', queryKeys: [], signals: ['Invalid URL format'], trustworthyContext: false }
  }
}
