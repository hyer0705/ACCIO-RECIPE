import { lookup as dnsLookupPromise } from 'dns/promises';
import { lookup as dnsLookupCallback } from 'dns';
import { Agent } from 'undici';
import ipaddr from 'ipaddr.js';

/**
 * IP 주소가 사설 주소 대역(Private, Loopback, Reserved)인지 확인합니다.
 */
export function isPrivateIp(ip: string): boolean {
  try {
    const addr = ipaddr.parse(ip);
    const range = addr.range();

    // Loopback, Link-local, Unique-local 확인
    if (['loopback', 'linkLocal', 'uniqueLocal', 'unspecified', 'broadcast'].includes(range)) {
      return true;
    }

    // IPv4 사설 대역 (RFC 1918)
    if (addr.kind() === 'ipv4') {
      if (range === 'private') return true;
    }

    // IPv6의 경우 IPv4-mapped address를 추출하여 내부 IPv4가 사설 대역인지 확인
    if (addr.kind() === 'ipv6') {
      const ipv6Addr = addr as ipaddr.IPv6;
      if (ipv6Addr.isIPv4MappedAddress()) {
        const ipv4Addr = ipv6Addr.toIPv4Address();
        return isPrivateIp(ipv4Addr.toString());
      }
    }

    return false;
  } catch (err) {
    console.error('IP parsing error:', err);
    // 파싱 실패 시 안전하게 사설로 간주하거나 false 반환
    // 여기서는 유효하지 않은 IP는 일단 public이 아니라고 보고 true를 반환하여 차단하는 것이 안전할 수 있음
    return true;
  }
}

function ensurePublicIp(ip: string): string {
  if (isPrivateIp(ip)) {
    throw new Error('허용되지 않는 IP 주소입니다.');
  }

  return ip;
}

/**
 * URL이 안전한지 검증합니다.
 * 1. 프로토콜이 http 또는 https인지 확인
 * 2. 호스트명이 IP 형식이 아닌지 확인 (IP 직접 접근 차단)
 * 3. 호스트명을 IP로 변환하여 사설 IP 대역인지 확인
 */
export async function validateSafeUrl(urlStr: string): Promise<{ url: URL; safeIp: string }> {
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
    return { url, safeIp: hostname };
  }

  // DNS 조회를 통해 실제 IP 확인 (SSRF 방지)
  let safeIp: string | null = null;
  try {
    const addresses = await dnsLookupPromise(hostname, { all: true });
    for (const result of addresses) {
      if (isPrivateIp(result.address)) {
        throw new Error(`허용되지 않는 IP 주소(${result.address})에 연결하려고 시도했습니다.`);
      }
      if (!safeIp) safeIp = result.address;
    }
    if (!safeIp) {
      throw new Error('연결 가능한 IP 주소를 찾지 못했습니다.');
    }
  } catch (err) {
    // DNS 분석 실패는 일단 서버 오류로 처리하거나 무시할 수 있으나 보안상 차단이 안전함
    // 하지만 일반적인 서비스에서는 DNS 실패를 허용할 수도 있음. 여기선 차단.
    if (err instanceof Error && err.message.includes('ENOTFOUND')) {
      throw new Error('존재하지 않는 도메인이거나 연결할 수 없는 주소입니다.');
    }
    throw err;
  }

  return { url, safeIp };
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
    const { url: validatedUrl, safeIp } = await validateSafeUrl(currentUrl);

    // DNS Rebinding 방지를 위해 검증된 IP로 직접 연결하는 Agent 사용
    const dispatcher = new Agent({
      connect: {
        lookup: (hostname, lookupOptions, callback) => {
          if (hostname === validatedUrl.hostname) {
            callback(null, [{ address: safeIp, family: safeIp.includes(':') ? 6 : 4 }]);
            return;
          }

          dnsLookupCallback(hostname, lookupOptions, (err, address, family) => {
            if (err) {
              callback(err, []);
              return;
            }

            try {
              if (Array.isArray(address)) {
                callback(
                  null,
                  address.map((result) => ({
                    ...result,
                    address: ensurePublicIp(result.address),
                  })),
                );
                return;
              }

              callback(null, [
                {
                  address: ensurePublicIp(address as string),
                  family: family as 4 | 6,
                },
              ]);
            } catch (validationError) {
              callback(
                validationError instanceof Error
                  ? validationError
                  : new Error('허용되지 않는 IP 주소입니다.'),
                [],
              );
            }
          });
        },
      },
    });

    let response: Response;
    try {
      response = await fetch(currentUrl, {
        ...options,
        // @ts-expect-error: Dispatcher is an undici-specific extension to fetch
        dispatcher,
        redirect: 'manual', // 리다이렉트를 수동으로 처리
      });
    } finally {
      await dispatcher.close();
    }

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
