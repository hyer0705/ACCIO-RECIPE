import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockDnsLookup = vi.hoisted(() => vi.fn());
const mockDispatcherClose = vi.hoisted(() => vi.fn(async () => {}));
const mockAgentInstances = vi.hoisted(() => [] as Array<Record<string, unknown>>);
const mockAgent = vi.hoisted(() =>
  vi.fn(
    class MockAgent {
      close = mockDispatcherClose;

      constructor(options: unknown) {
        Object.assign(this, options);
        mockAgentInstances.push(this as unknown as Record<string, unknown>);
      }
    },
  ),
);

// dns lookup 모킹
vi.mock('dns/promises', () => ({
  lookup: vi.fn(async (hostname: string, options?: { all?: boolean }) => {
    const records = (() => {
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return [{ address: '127.0.0.1', family: 4 }];
      }
      if (hostname === 'private.com') {
        return [{ address: '192.168.1.1', family: 4 }];
      }
      if (hostname === 'google.com') {
        return [{ address: '8.8.8.8', family: 4 }];
      }
      if (hostname === 'metadata.google.internal') {
        return [{ address: '169.254.169.254', family: 4 }];
      }
      if (hostname === 'rebinding-attack.com') {
        // 공용 IP와 사설 IP가 섞여 있는 경우
        return [
          { address: '1.2.3.4', family: 4 },
          { address: '192.168.1.1', family: 4 },
        ];
      }
      return null;
    })();

    if (!records) throw new Error('ENOTFOUND');

    if (options?.all) {
      return records;
    }
    return records[0];
  }),
}));

vi.mock('dns', () => ({
  lookup: mockDnsLookup,
}));

vi.mock('undici', () => ({
  Agent: mockAgent,
}));

import { isPrivateIp, validateSafeUrl, fetchWithSsrfProtection } from '@/lib/security';

beforeEach(() => {
  mockDnsLookup.mockReset();
  mockDispatcherClose.mockClear();
  mockAgent.mockClear();
  mockAgentInstances.length = 0;
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('isPrivateIp', () => {
  it('should return true for private IPv4 addresses', () => {
    expect(isPrivateIp('127.0.0.1')).toBe(true);
    expect(isPrivateIp('10.0.0.1')).toBe(true);
    expect(isPrivateIp('172.16.0.1')).toBe(true);
    expect(isPrivateIp('172.31.255.255')).toBe(true);
    expect(isPrivateIp('192.168.1.1')).toBe(true);
    expect(isPrivateIp('169.254.169.254')).toBe(true);
    expect(isPrivateIp('0.0.0.0')).toBe(true);
  });

  it('should return false for public IPv4 addresses', () => {
    expect(isPrivateIp('8.8.8.8')).toBe(false);
    expect(isPrivateIp('1.1.1.1')).toBe(false);
    expect(isPrivateIp('203.0.113.1')).toBe(false);
  });

  it('should return true for private IPv6 addresses', () => {
    expect(isPrivateIp('::1')).toBe(true);
    expect(isPrivateIp('0:0:0:0:0:0:0:1')).toBe(true);
    expect(isPrivateIp('fe80::1')).toBe(true);
    expect(isPrivateIp('fc00::1')).toBe(true);
    expect(isPrivateIp('fd00::1')).toBe(true);
    // CIDR 범위 테스트 (fe80::/10)
    expect(isPrivateIp('febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff')).toBe(true);
  });

  it('should handle IPv4-mapped IPv6 addresses correctly', () => {
    // 사설 대역 매핑
    expect(isPrivateIp('::ffff:127.0.0.1')).toBe(true);
    expect(isPrivateIp('::ffff:10.0.0.1')).toBe(true);
    expect(isPrivateIp('::ffff:172.16.0.1')).toBe(true);
    expect(isPrivateIp('::ffff:192.168.1.1')).toBe(true);

    // 공인 대역 매핑 (차단되면 안 됨)
    expect(isPrivateIp('::ffff:172.217.0.1')).toBe(false); // Google public IP
    expect(isPrivateIp('::ffff:8.8.8.8')).toBe(false);
  });
});

describe('validateSafeUrl', () => {
  it('should allow safe public URLs', async () => {
    const { url, safeIp } = await validateSafeUrl('https://google.com/search');
    expect(url.hostname).toBe('google.com');
    expect(safeIp).toBe('8.8.8.8');
  });

  it('should throw for non-http/https protocols', async () => {
    await expect(validateSafeUrl('ftp://example.com')).rejects.toThrow('허용되지 않는 프로토콜');
    await expect(validateSafeUrl('file:///etc/passwd')).rejects.toThrow('허용되지 않는 프로토콜');
  });

  it('should throw for private hostnames', async () => {
    await expect(validateSafeUrl('http://localhost')).rejects.toThrow('허용되지 않는 IP 주소');
    await expect(validateSafeUrl('http://127.0.0.1')).rejects.toThrow('사설 IP 주소');
    await expect(validateSafeUrl('http://private.com')).rejects.toThrow('허용되지 않는 IP 주소');
    await expect(validateSafeUrl('http://metadata.google.internal')).rejects.toThrow(
      '허용되지 않는 IP 주소',
    );
  });

  it('should throw for domains with multiple records including private IPs (DNS Rebinding protection)', async () => {
    await expect(validateSafeUrl('http://rebinding-attack.com')).rejects.toThrow(
      '허용되지 않는 IP 주소',
    );
  });

  it('should throw for non-existent domains', async () => {
    await expect(validateSafeUrl('https://this-domain-does-not-exist-123.com')).rejects.toThrow(
      '존재하지 않는 도메인',
    );
  });
});

describe('fetchWithSsrfProtection', () => {
  it('should close the dispatcher after a successful request', async () => {
    const fetchMock = vi.fn(async () => new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await fetchWithSsrfProtection('https://google.com/search');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mockAgent).toHaveBeenCalledTimes(1);
    expect(mockDispatcherClose).toHaveBeenCalledTimes(1);
  });

  it('should reject fallback DNS results that resolve to private IPs', async () => {
    interface LookupAddress {
      address: string;
      family: number;
    }

    let dispatchedLookup:
      | ((
          hostname: string,
          options: unknown,
          callback: (err: Error | null, addresses: LookupAddress[]) => void,
        ) => void)
      | undefined;

    const fetchMock = vi.fn(async (_input, init?: RequestInit) => {
      const dispatcher = (
        init as RequestInit & {
          dispatcher?: {
            connect?: {
              lookup?: typeof dispatchedLookup;
            };
          };
        }
      )?.dispatcher;

      dispatchedLookup = dispatcher?.connect?.lookup;

      return new Response('ok', { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    mockDnsLookup.mockImplementationOnce(
      (
        _hostname: string,
        _options: unknown,
        callback: (err: Error | null, address?: string, family?: number) => void,
      ) => {
        callback(null, '127.0.0.1', 4);
      },
    );

    await fetchWithSsrfProtection('https://google.com/search');

    expect(dispatchedLookup).toBeTypeOf('function');

    const result = await new Promise<{ err: unknown; addresses: unknown[] }>((resolve) => {
      dispatchedLookup?.('cdn.google.com', { all: false }, (err: unknown, addresses: unknown[]) => {
        resolve({ err, addresses });
      });
    });

    expect(result.err).toBeInstanceOf(Error);
    expect((result.err as Error).message).toContain('허용되지 않는 IP 주소');
    expect(result.addresses).toEqual([]);
  });
});
