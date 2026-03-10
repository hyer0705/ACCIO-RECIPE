import { lookup } from 'dns/promises';

/**
 * IP 주소가 사설 주소 대역(Private, Loopback, Reserved)인지 확인합니다.
 */
export function isPrivateIp(ip: string): boolean {
  // IPv4 사설 대역
  // 127.0.0.0/8 (Loopback)
  // 10.0.0.0/8 (Private)
  // 172.16.0.0/12 (Private)
  // 192.168.0.0/16 (Private)
  // 169.254.0.0/16 (Link-local)
  // 0.0.0.0/8 (Broadcast)
  const ipv4Match = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4Match) {
    const [_, o1, o2] = ipv4Match.map(Number);
    if (o1 === 127) return true;
    if (o1 === 10) return true;
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return true;
    if (o1 === 192 && o2 === 168) return true;
    if (o1 === 169 && o2 === 254) return true;
    if (o1 === 0) return true;
    return false;
  }

  // IPv6 사설 및 루프백 대역 (간단한 체크)
  const ipv6 = ip.toLowerCase();
  if (ipv6 === '::1' || ipv6 === '0:0:0:0:0:0:0:1') return true;
  if (ipv6.startsWith('fe80:')) return true; // Link-local
  if (ipv6.startsWith('fc00:') || ipv6.startsWith('fd00:')) return true; // Unique local addr
  if (
    ipv6.startsWith('::ffff:127.') ||
    ipv6.startsWith('::ffff:10.') ||
    ipv6.startsWith('::ffff:192.168.') ||
    ipv6.startsWith('::ffff:172.')
  )
    return true; // IPv4-mapped private

  return false;
}

/**
 * URL이 안전한지 검증합니다.
 * 1. 프로토콜이 http 또는 https인지 확인
 * 2. 호스트명이 IP 형식이 아닌지 확인 (IP 직접 접근 차단)
 * 3. 호스트명을 IP로 변환하여 사설 IP 대역인지 확인
 */
export async function validateSafeUrl(urlStr: string): Promise<URL> {
  const url = new URL(urlStr);

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('허용되지 않는 프로토콜입니다. http 또는 https만 가능합니다.');
  }

  const hostname = url.hostname;

  // 호스트명이 직접적인 IP 주소인지 확인
  const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(':');
  if (isIp) {
    if (isPrivateIp(hostname)) {
      throw new Error('사설 IP 주소로의 접근은 허용되지 않습니다.');
    }
  }

  // DNS 조회를 통해 실제 IP 확인 (SSRF 방지)
  try {
    const result = await lookup(hostname);
    if (isPrivateIp(result.address)) {
      throw new Error(`허용되지 않는 IP 주소(${result.address})에 연결하려고 시도했습니다.`);
    }
  } catch (err) {
    // DNS 분석 실패는 일단 서버 오류로 처리하거나 무시할 수 있으나 보안상 차단이 안전함
    // 하지만 일반적인 서비스에서는 DNS 실패를 허용할 수도 있음. 여기선 차단.
    if (err instanceof Error && err.message.includes('ENOTFOUND')) {
      throw new Error('존재하지 않는 도메인이거나 연결할 수 없는 주소입니다.');
    }
    throw err;
  }

  return url;
}

/**
 * SSRF 방지 기능이 포함된 fetch 함수입니다.
 * 리다이렉트를 수동으로 추적하며 매 단계마다 URL을 검증합니다.
 */
export async function fetchWithSsrfProtection(
  url: string,
  options: RequestInit = {},
  maxRedirects = 5,
): Promise<Response> {
  let currentUrl = url;
  let redirectCount = 0;

  while (redirectCount <= maxRedirects) {
    await validateSafeUrl(currentUrl);

    const response = await fetch(currentUrl, {
      ...options,
      redirect: 'manual', // 리다이렉트를 수동으로 처리
    });

    if (!response) {
      throw new Error('네트워크 응답이 없습니다.');
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        return response; // 위치 정보가 없으면 그대로 반환
      }

      // 상대 경로 처리
      const nextUrl = new URL(location, currentUrl).toString();
      currentUrl = nextUrl;
      redirectCount++;
      continue;
    }

    return response;
  }

  throw new Error('너무 많은 리다이렉트가 발생했습니다.');
}
