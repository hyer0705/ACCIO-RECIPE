import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { SSEWriter } from '@/lib/recipe/sse';
import { validateSafeUrl } from '@/lib/security';
import * as recipeService from '@/services/recipeService';

export async function POST(req: Request) {
  // 1. 초기 검증 (스트림 시작 전)
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !('id' in session.user)) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
  }

  const userId = parseInt(session.user.id as string, 10);
  let url: string;
  try {
    const json = await req.json();
    url = json.url;
  } catch {
    return NextResponse.json({ success: false, error: '잘못된 요청 형식입니다.' }, { status: 400 });
  }

  if (!url) {
    return NextResponse.json({ success: false, error: 'URL을 제공해야 합니다.' }, { status: 400 });
  }

  // URL 검증 및 SSRF 방지 (스트림 시작 전 수행하여 위험한 요청 조기 차단)
  try {
    const parsedUrl = await validateSafeUrl(url);
    url = parsedUrl.toString();
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  // 2. SSE 스트림 생성
  const stream = new ReadableStream({
    async start(controller) {
      const sse = new SSEWriter(controller);
      const abortController = new AbortController();
      const { signal } = abortController;

      const onAbort = () => {
        console.log('Client disconnected, aborting extraction...');
        abortController.abort();
        controller.close();
      };
      req.signal.addEventListener('abort', onAbort);

      try {
        await recipeService.startExtractionProcess(userId, url, sse, signal);
      } catch (err: unknown) {
        const error = err as Error;
        console.error('Extract API Stream Error:', error);
        sse.write({ step: 4, total: 4, message: `서버 에러: ${error.message}` });
        sse.close();
      } finally {
        req.signal.removeEventListener('abort', onAbort);
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
