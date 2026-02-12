/**
 * SVG sanitizer - allowlist based tag/attribute filtering.
 * Policy: allow most standard SVG features, block clear XSS vectors.
 */

const ALLOWED_TAGS = new Set([
  'svg', 'g', 'defs', 'symbol', 'use',
  'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon',
  'text', 'tspan', 'textpath',
  'lineargradient', 'radialgradient', 'stop',
  'pattern', 'clippath', 'mask', 'marker',
  'filter', 'fegaussianblur', 'femerge', 'femergenode',
  'feoffset', 'fecolormatrix', 'fecomponenttransfer', 'fefunca', 'fefuncb', 'fefuncg', 'fefuncr',
  'fecomposite', 'feblend', 'feturbulence', 'fedisplacementmap',
  'flood', 'feflood', 'femorphology', 'feimage', 'fedropshadow',
  'animate', 'animatetransform', 'animatemotion', 'set', 'mpath',
  'title', 'desc',
]);

const BLOCKED_TAGS = new Set([
  'script', 'foreignobject', 'iframe', 'object', 'embed', 'canvas', 'audio', 'video',
  'html', 'head', 'body', 'link', 'meta', 'style',
]);

const ALLOWED_ATTRS = new Set([
  // geometry / layout
  'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry',
  'width', 'height', 'viewbox', 'preserveaspectratio', 'transform', 'transform-origin',
  'd', 'points', 'pathlength',
  // paint / appearance
  'fill', 'fill-rule', 'fill-opacity',
  'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-opacity',
  'opacity', 'vector-effect', 'paint-order',
  // text
  'font-family', 'font-size', 'font-weight', 'font-style', 'text-anchor', 'dominant-baseline', 'letter-spacing', 'word-spacing',
  // defs / references
  'id', 'class', 'href', 'xlink:href', 'clip-path', 'clip-rule', 'mask', 'filter',
  'gradientunits', 'gradienttransform', 'offset', 'stop-color', 'stop-opacity',
  'patternunits', 'patterncontentunits', 'patterntransform', 'maskunits', 'maskcontentunits', 'clippathunits',
  // filter primitives
  'filterunits', 'primitiveunits', 'result', 'in', 'in2', 'stddeviation', 'dx', 'dy',
  'operator', 'k1', 'k2', 'k3', 'k4', 'mode', 'type', 'values', 'tablevalues',
  'slope', 'intercept', 'amplitude', 'exponent', 'edgemode', 'kernelmatrix', 'kernelunitlength',
  'targetx', 'targety', 'surfacescale', 'specularconstant', 'specularexponent', 'lighting-color',
  'xchannelselector', 'ychannelselector', 'radius', 'seed', 'numoctaves', 'basefrequency',
  // animation
  'attributename', 'attributetype', 'begin', 'dur', 'end', 'min', 'max', 'restart',
  'repeatcount', 'repeatdur', 'from', 'to', 'by', 'keytimes', 'keysplines', 'calcmode',
  'additive', 'accumulate', 'rotate',
  // misc / namespace
  'xmlns', 'xmlns:xlink', 'version', 'style',
]);

const ALLOWED_STYLE_PROPS = new Set([
  'fill', 'fill-opacity', 'fill-rule',
  'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-opacity',
  'opacity', 'stop-color', 'stop-opacity',
  'font-family', 'font-size', 'font-weight', 'font-style',
  'text-anchor', 'dominant-baseline', 'letter-spacing', 'word-spacing',
  'filter', 'clip-path', 'mask', 'transform',
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
    const lowered = tagName.toLowerCase();
    if (BLOCKED_TAGS.has(lowered)) return '';
    if (ALLOWED_TAGS.has(lowered)) {
      // 허용된 태그 - 속성만 필터링
      return sanitizeTag(match, tagName);
    }
    // 허용되지 않은 태그 제거
    return '';
  });

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

    if (attrName === 'style') {
      const safeStyle = sanitizeStyleAttribute(attrValue);
      if (!safeStyle) continue;
      attrs += ` style="${safeStyle}"`;
      continue;
    }

    if (!isSafeAttributeValue(attrName, attrValue)) continue;

    attrs += ` ${m[1]}="${attrValue}"`;
  }

  const selfClose = tag.trimEnd().endsWith('/>') ? ' /' : '';
  return `<${tagName}${attrs}${selfClose}>`;
}

function sanitizeStyleAttribute(styleValue: string): string | null {
  const safeDecls: string[] = [];
  const decls = styleValue.split(';');

  for (const decl of decls) {
    const idx = decl.indexOf(':');
    if (idx <= 0) continue;
    const prop = decl.slice(0, idx).trim().toLowerCase();
    const value = decl.slice(idx + 1).trim();
    if (!value) continue;
    if (!ALLOWED_STYLE_PROPS.has(prop)) continue;
    if (!isSafeAttributeValue(prop, value)) continue;
    safeDecls.push(`${prop}:${value}`);
  }

  if (safeDecls.length === 0) return null;
  return safeDecls.join(';');
}

function isSafeAttributeValue(attrName: string, attrValue: string): boolean {
  const value = attrValue.trim();
  if (!value) return true;
  if (/[<>]/.test(value)) return false;
  if (/(?:javascript|vbscript)\s*:/i.test(value)) return false;
  if (/\bexpression\s*\(/i.test(value)) return false;

  if (attrName === 'href' || attrName === 'xlink:href') {
    // Only allow local fragment refs to prevent external fetch / script URLs.
    return /^#[A-Za-z_][A-Za-z0-9_.:-]*$/.test(value);
  }

  if (/url\s*\(/i.test(value)) {
    // Allow only url(#local-id) references.
    const urlRefRegex = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
    let match: RegExpExecArray | null;
    while ((match = urlRefRegex.exec(value)) !== null) {
      if (!/^#[A-Za-z_][A-Za-z0-9_.:-]*$/.test(match[2])) return false;
    }
  }

  return true;
}
