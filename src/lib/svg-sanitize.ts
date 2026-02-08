/**
 * SVG sanitizer - allowlist 기반 태그/속성 필터링
 * 스펙 §4 참고
 */

const ALLOWED_TAGS = new Set([
  'svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line',
  'polyline', 'polygon', 'text', 'tspan', 'defs', 'linearGradient',
  'radialGradient', 'stop', 'symbol', 'use', 'clipPath', 'mask',
]);

const ALLOWED_ATTRS = new Set([
  'd', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
  'stroke-dasharray', 'stroke-opacity', 'fill-opacity',
  'viewBox', 'width', 'height', 'transform',
  'cx', 'cy', 'r', 'rx', 'ry',
  'x', 'y', 'x1', 'x2', 'y1', 'y2',
  'points', 'gradientUnits', 'offset', 'stop-color', 'stop-opacity',
  'opacity', 'font-size', 'text-anchor', 'dominant-baseline',
  'clip-path', 'mask',
  // namespace attrs
  'xmlns',
]);

/**
 * SVG 마크업을 sanitize한다.
 * - 허용 태그 외 제거
 * - 허용 속성 외 제거
 * - script/event 핸들러 제거
 *
 * @returns sanitized SVG string
 * @throws Error if input doesn't contain a valid <svg> root
 */
export function sanitizeSvg(input: string): string {
  const trimmed = input.trim();

  // 기본 구조 체크: <svg 로 시작하거나 포함해야 함
  if (!/<svg[\s>]/i.test(trimmed)) {
    throw new Error('Invalid SVG: missing <svg> root element');
  }

  // 태그 처리: 허용 태그 외 제거 (내용은 유지, 태그만 strip)
  let result = trimmed;

  // 1) 스크립트 블록 제거
  result = result.replace(/<script[\s\S]*?<\/script>/gi, '');

  // 2) 이벤트 핸들러 속성 제거 (on*)
  result = result.replace(/\s+on\w+\s*=\s*(['"])[^'"]*\1/gi, '');
  result = result.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, '');

  // 3) 허용되지 않은 태그를 제거 (여는/닫는 태그 모두)
  result = result.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g, (match, tagName: string) => {
    if (ALLOWED_TAGS.has(tagName.toLowerCase())) {
      // 허용된 태그 - 속성만 필터링
      return sanitizeTag(match, tagName);
    }
    // 허용되지 않은 태그 제거
    return '';
  });

  // 4) href / xlink:href 제거 (XSS vector)
  result = result.replace(/\s+(?:xlink:)?href\s*=\s*(['"])[^'"]*\1/gi, '');

  return result;
}

function sanitizeTag(tag: string, _tagName: string): string {
  // 닫는 태그는 그대로
  if (tag.startsWith('</')) return tag;

  // 속성 파싱: key="value" 또는 key='value' 또는 key=value
  const attrRegex = /([a-zA-Z][\w:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*))/g;
  const tagOpen = tag.match(/^<([a-zA-Z][a-zA-Z0-9]*)/);
  if (!tagOpen) return '';

  const tagName = tagOpen[1];
  let attrs = '';
  let m: RegExpExecArray | null;

  while ((m = attrRegex.exec(tag)) !== null) {
    const attrName = m[1].toLowerCase();
    const attrValue = m[2] ?? m[3] ?? m[4] ?? '';

    if (!ALLOWED_ATTRS.has(attrName)) continue;

    // javascript: URL 차단
    if (/javascript:/i.test(attrValue)) continue;

    attrs += ` ${m[1]}="${attrValue}"`;
  }

  const selfClose = tag.trimEnd().endsWith('/>') ? ' /' : '';
  return `<${tagName}${attrs}${selfClose}>`;
}
