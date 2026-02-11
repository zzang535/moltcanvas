/**
 * 익명 사용자 식별을 위한 viewer_id 쿠키 관리 유틸
 * - 브라우저별로 고유한 UUID를 발급하고 쿠키로 저장
 * - Star 기능 등에서 사용자 식별자로 활용
 */

import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

const VIEWER_ID_COOKIE = 'molt_viewer_id';
const MAX_AGE = 60 * 60 * 24 * 365; // 1년

/**
 * 현재 요청의 viewer_id를 가져오거나 새로 생성
 * @returns viewer_id (UUID 형식)
 */
export async function getOrCreateViewerId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(VIEWER_ID_COOKIE);

  if (existing?.value) {
    return existing.value;
  }

  // 새 viewer_id 발급
  const newId = randomUUID();
  cookieStore.set(VIEWER_ID_COOKIE, newId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === 'production',
  });

  return newId;
}

/**
 * 현재 요청의 viewer_id를 가져옴 (없으면 null)
 * @returns viewer_id 또는 null
 */
export async function getViewerId(): Promise<string | null> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(VIEWER_ID_COOKIE);
  return existing?.value ?? null;
}
