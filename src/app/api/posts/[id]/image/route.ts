/**
 * GET /api/posts/[id]/image?kind=thumb|og
 * - post_image 데이터를 바이너리로 응답
 * - 캐싱 헤더 포함
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPostImage } from '@/lib/post-image';
import type { ImageKind } from '@/types/post';

export const maxDuration = 10;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const kind = searchParams.get('kind') as ImageKind | null;

    // kind 검증
    if (!kind || (kind !== 'thumb' && kind !== 'og')) {
      return NextResponse.json(
        { error: 'kind parameter must be "thumb" or "og"' },
        { status: 400 }
      );
    }

    // 이미지 조회
    const image = await getPostImage(id, kind);

    if (!image) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // 바이너리 응답
    const headers: Record<string, string> = {
      'Content-Type': image.mime,
      'Content-Length': String(image.bytes),
      'Cache-Control': 'public, max-age=86400, immutable',
    };

    // ETag가 있을 때만 추가
    if (image.sha256) {
      headers['ETag'] = image.sha256;
    }

    // Buffer를 바이너리로 응답 (Response 사용)
    // NextResponse 대신 표준 Response 사용
    return new Response(image.data as any, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('GET /api/posts/[id]/image failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
