/**
 * Playwright 기반 이미지 캡처 유틸리티
 * - /render/[id] 페이지를 로드하여 스크린샷 생성
 * - thumb(1024x1024), og(1200x630) 크기 지원
 */

import { chromium, type Browser, type Page } from 'playwright';
import { createHash } from 'crypto';
import { savePostImage } from './post-image';
import type { ImageKind } from '@/types/post';

interface CaptureOptions {
  postId: string;
  kind: ImageKind;
  baseUrl?: string;
  timeout?: number;
  waitForLoad?: number;
}

interface CaptureResult {
  success: boolean;
  mime: string;
  width: number;
  height: number;
  bytes: number;
  sha256: string;
  error?: string;
}

const DEFAULT_TIMEOUT = 30000; // 30초
const DEFAULT_WAIT_FOR_LOAD = 800; // 애니메이션 안정화 대기 시간

/**
 * 단일 post의 이미지 캡처
 */
export async function capturePostImage(
  options: CaptureOptions
): Promise<CaptureResult> {
  const {
    postId,
    kind,
    baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    timeout = DEFAULT_TIMEOUT,
    waitForLoad = DEFAULT_WAIT_FOR_LOAD,
  } = options;

  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    // 캡처 크기 설정
    const dimensions = kind === 'thumb'
      ? { width: 1024, height: 1024 }
      : { width: 1200, height: 630 };

    // 브라우저 실행
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--enable-webgl',
        '--use-gl=swiftshader',
      ],
    });

    page = await browser.newPage({
      viewport: dimensions,
      deviceScaleFactor: 1,
    });

    // 타임아웃 설정
    page.setDefaultTimeout(timeout);

    // 렌더 페이지 로드
    const url = `${baseUrl}/render/${postId}?capture=1&kind=${kind}`;
    await page.goto(url, { waitUntil: 'networkidle' });

    // 렌더링 안정화 대기
    await page.waitForTimeout(waitForLoad);

    // 스크린샷 캡처
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: false,
    });

    // SHA256 해시 생성
    const hash = createHash('sha256');
    hash.update(screenshot);
    const sha256 = hash.digest('hex');

    // DB에 저장
    await savePostImage(
      postId,
      kind,
      'image/png',
      dimensions.width,
      dimensions.height,
      screenshot.length,
      screenshot,
      sha256
    );

    return {
      success: true,
      mime: 'image/png',
      width: dimensions.width,
      height: dimensions.height,
      bytes: screenshot.length,
      sha256,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Capture failed for post ${postId} (${kind}):`, errorMsg);

    return {
      success: false,
      mime: 'image/png',
      width: 0,
      height: 0,
      bytes: 0,
      sha256: '',
      error: errorMsg,
    };
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
  }
}

/**
 * 여러 post의 이미지를 순차적으로 캡처
 */
export async function captureBatchPostImages(
  postIds: string[],
  kind: ImageKind,
  options?: Partial<CaptureOptions>
): Promise<Map<string, CaptureResult>> {
  const results = new Map<string, CaptureResult>();

  for (const postId of postIds) {
    console.log(`Capturing ${kind} for post ${postId}...`);
    const result = await capturePostImage({
      postId,
      kind,
      ...options,
    });
    results.set(postId, result);

    if (result.success) {
      console.log(`✅ Captured ${kind} for ${postId} (${result.bytes} bytes)`);
    } else {
      console.error(`❌ Failed to capture ${kind} for ${postId}: ${result.error}`);
    }
  }

  return results;
}

/**
 * 단일 post의 thumb + og 모두 캡처
 */
export async function captureAllImagesForPost(
  postId: string,
  options?: Partial<CaptureOptions>
): Promise<{ thumb: CaptureResult; og: CaptureResult }> {
  console.log(`Capturing all images for post ${postId}...`);

  const thumb = await capturePostImage({
    postId,
    kind: 'thumb',
    ...options,
  });

  const og = await capturePostImage({
    postId,
    kind: 'og',
    ...options,
  });

  return { thumb, og };
}
