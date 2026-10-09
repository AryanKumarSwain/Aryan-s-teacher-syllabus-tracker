import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import katex from 'katex';
import html2canvas from 'html2canvas';

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Load Devanagari font for Hindi text rendering
function loadDevanagariFont(doc: any): void {
  if (typeof window === 'undefined') {
    try {
      const fs = require('fs');
      const path = require('path');
      const fontDir = path.join(__dirname);
      
      const regularBase64 = fs.readFileSync(path.join(fontDir, 'noto-sans-devanagari-regular.b64'), 'utf-8');
      const boldBase64 = fs.readFileSync(path.join(fontDir, 'noto-sans-devanagari-bold.b64'), 'utf-8');
      
      // @ts-ignore - jsPDF addFileToVFS and addFont methods
      doc.addFileToVFS('NotoSansDevanagari-Regular.ttf', regularBase64);
      // @ts-ignore
      doc.addFont('NotoSansDevanagari-Regular.ttf', 'NotoSansDevanagari', 'normal');
      
      // @ts-ignore
      doc.addFileToVFS('NotoSansDevanagari-Bold.ttf', boldBase64);
      // @ts-ignore
      doc.addFont('NotoSansDevanagari-Bold.ttf', 'NotoSansDevanagari', 'bold');
    } catch {
      // Ignore if font files not found in SSR environment
    }
  }
}

// Detect if text contains Devanagari characters
function containsDevanagari(text: string): boolean {
  return /[\u0900-\u097F]/.test(text);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

// In-memory cache for downloaded font base64 strings
const fontBinaryCache = new Map<string, string>();

async function ensureCustomFontLoaded(doc: any, fontFamily: string): Promise<string> {
  const fontMap: Record<string, { regular: string; bold?: string; italic?: string }> = {
    'Century Gothic': { regular: '/fonts/GOTHIC.TTF', bold: '/fonts/GOTHICB.TTF', italic: '/fonts/GOTHICI.TTF' },
    'Calibri': { regular: '/fonts/calibri.ttf', bold: '/fonts/calibrib.ttf', italic: '/fonts/calibrii.ttf' },
    'Georgia': { regular: '/fonts/georgia.ttf', bold: '/fonts/georgiab.ttf', italic: '/fonts/georgiai.ttf' },
    'Verdana': { regular: '/fonts/verdana.ttf', bold: '/fonts/verdanab.ttf', italic: '/fonts/verdanai.ttf' },
    'Trebuchet MS': { regular: '/fonts/trebuc.ttf', bold: '/fonts/trebucbd.ttf', italic: '/fonts/trebucit.ttf' },
  };

  const config = fontMap[fontFamily];
  if (!config || typeof window === 'undefined') {
    if (fontFamily === 'Times New Roman' || fontFamily === 'Cambria') return 'Times';
    return 'Helvetica';
  }

  try {
    const safeFamilyName = fontFamily.replace(/\s+/g, '_');
    if (!fontBinaryCache.has(config.regular)) {
      const resp = await fetch(config.regular);
      if (resp.ok) {
        const buffer = await resp.arrayBuffer();
        fontBinaryCache.set(config.regular, arrayBufferToBase64(buffer));
      }
    }
    const regBase64 = fontBinaryCache.get(config.regular);
    if (regBase64) {
      doc.addFileToVFS(`${safeFamilyName}-Regular.ttf`, regBase64);
      doc.addFont(`${safeFamilyName}-Regular.ttf`, fontFamily, 'normal');
    }

    if (config.bold) {
      if (!fontBinaryCache.has(config.bold)) {
        const resp = await fetch(config.bold);
        if (resp.ok) {
          const buffer = await resp.arrayBuffer();
          fontBinaryCache.set(config.bold, arrayBufferToBase64(buffer));
        }
      }
      const boldBase64 = fontBinaryCache.get(config.bold);
      if (boldBase64) {
        doc.addFileToVFS(`${safeFamilyName}-Bold.ttf`, boldBase64);
        doc.addFont(`${safeFamilyName}-Bold.ttf`, fontFamily, 'bold');
      }
    }

    if (config.italic) {
      if (!fontBinaryCache.has(config.italic)) {
        const resp = await fetch(config.italic);
        if (resp.ok) {
          const buffer = await resp.arrayBuffer();
          fontBinaryCache.set(config.italic, arrayBufferToBase64(buffer));
        }
      }
      const italicBase64 = fontBinaryCache.get(config.italic);
      if (italicBase64) {
        doc.addFileToVFS(`${safeFamilyName}-Italic.ttf`, italicBase64);
        doc.addFont(`${safeFamilyName}-Italic.ttf`, fontFamily, 'italic');
      }
    }

    return fontFamily;
  } catch (err) {
    console.warn(`Failed to load custom font ${fontFamily}, falling back:`, err);
    if (fontFamily === 'Times New Roman' || fontFamily === 'Cambria') return 'Times';
    return 'Helvetica';
  }
}

interface PdfPaperData {
  schoolName: string;
  examName: string;
  className: string;
  subjectName: string;
  examDate: string;
  totalMarks: number;
  duration: number;
  instructions: string;
  templateType: 'SINGLE' | 'SPLIT';
  styleFontFamily: string;
  styleFontSize: string;
  styleColor: string;
  logoUrl?: string;
  teacherName?: string;
  showTeacherName?: boolean;
  sections: Array<{
    label: string;
    type: string;
    marksEach: number;
    questions: Array<{
      questionText: string;
      subject?: string;
      hint?: string;
      options?: Array<{ text: string; isCorrect?: boolean } | string>;
      segmentType?: string;
      imageUrl?: string;
      matchingPairs?: Array<{ left: string; right: string }>;
      passageText?: string;
      subQuestions?: Array<{ text: string }>;
      assertion?: string;
      reason?: string;
      alternatives?: Array<{
        questionText: string;
        options?: Array<{ text: string; isCorrect?: boolean } | string>;
        imageUrl?: string;
        subject?: string;
        hint?: string;
      }>;
    }>;
    segments?: Array<{
      type: string;
      label: string;
      questionCount: number;
      marksEach: number;
    }>;
  }>;
}

// ---- Spacing constants ----
const LINE_HEIGHT = 4.0;        // height of a single wrapped text line
const QUESTION_GAP = 0.3;       // gap left after a question before the next one
const SECTION_GAP = 2;          // gap left after a whole section
const SEGMENT_HEADER_GAP = 5.0; // comfortable gap after a segment header line before Q1
const SEGMENT_BEFORE_GAP = 6.0; // gap before subsequent segment headers to separate from previous questions
const SECTION_LABEL_GAP = 5;    // gap after section label before Q1

const IMAGE_TEXT_GAP = 5;        // 5mm margin between text and image box
const IMAGE_RIGHT_MARGIN = 3;    // 3mm margin between image box and column right edge

interface FormattedTextSegment {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  sup: boolean;
  sub: boolean;
  code: boolean;
  listItem: boolean;
  isMath?: boolean;
  latex?: string;
  mathImg?: string;
  mathWidth?: number;
  mathHeight?: number;
  baselineRatio?: number;
}

interface OptionRenderData {
  prefix: string;
  prefixWidth: number;
  segments: FormattedTextSegment[];
  height: number;
}

function convertLatexToFallbackUnicode(latex: string): string {
  let text = latex.replace(/\$/g, '');
  text = text.replace(/\\cdot/g, '·');
  text = text.replace(/\\times/g, '×');
  text = text.replace(/\\div/g, '÷');
  text = text.replace(/\\pm/g, '±');
  text = text.replace(/\\mp/g, '∓');
  text = text.replace(/\\neq/g, '≠');
  text = text.replace(/\\leq?/g, '≤');
  text = text.replace(/\\geq?/g, '≥');
  text = text.replace(/\\approx/g, '≈');
  text = text.replace(/\\equiv/g, '≡');
  text = text.replace(/\\infty/g, '∞');
  text = text.replace(/\\pi/g, 'π');
  text = text.replace(/\\theta/g, 'θ');
  text = text.replace(/\\alpha/g, 'α');
  text = text.replace(/\\beta/g, 'β');
  text = text.replace(/\\gamma/g, 'γ');
  text = text.replace(/\\Delta/g, 'Δ');
  text = text.replace(/\\lambda/g, 'λ');
  text = text.replace(/\\mu/g, 'μ');
  text = text.replace(/\\sigma/g, 'σ');
  text = text.replace(/\\omega/g, 'ω');
  text = text.replace(/\\phi/g, 'φ');
  text = text.replace(/\\int/g, '∫');
  text = text.replace(/\\sum/g, '∑');
  text = text.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, '$1√($2)');
  text = text.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');
  text = text.replace(/\\frac\{1\}\{2\}/g, '½');
  text = text.replace(/\\frac\{1\}\{4\}/g, '¼');
  text = text.replace(/\\frac\{3\}\{4\}/g, '¾');
  text = text.replace(/\\frac\{1\}\{3\}/g, '⅓');
  text = text.replace(/\\frac\{2\}\{3\}/g, '⅔');
  text = text.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2');
  text = text.replace(/\^\{2\}/g, '²');
  text = text.replace(/\^\{3\}/g, '³');
  text = text.replace(/\^2/g, '²');
  text = text.replace(/\^3/g, '³');
  text = text.replace(/\^\{([^}]+)\}/g, '^$1');
  text = text.replace(/_\{([^}]+)\}/g, '_$1');
  text = text.replace(/\\left/g, '');
  text = text.replace(/\\right/g, '');
  text = text.replace(/\\/g, '');
  return text.trim();
}

// In-memory cache for rendered math images
const mathImageCache = new Map<string, { dataUrl: string; widthMm: number; heightMm: number; baselineRatio: number }>();

async function renderMathToImage(
  latex: string, 
  color: string = '#000000',
  fontSizePt: number = 10
): Promise<{ dataUrl: string; widthMm: number; heightMm: number; baselineRatio: number } | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;

  const trimmed = latex.trim();
  if (!trimmed) return null;

  const cacheKey = `v7_${trimmed}_${color}_${fontSizePt}`;
  if (mathImageCache.has(cacheKey)) {
    return mathImageCache.get(cacheKey)!;
  }

  let container: HTMLDivElement | null = null;
  try {
    container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = 'auto';
    container.style.height = 'auto';
    container.style.visibility = 'visible';
    container.style.opacity = '0.01';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '-9999';

    // Flex container to measure exact typographic baseline
    const flexWrap = document.createElement('div');
    flexWrap.style.display = 'inline-flex';
    flexWrap.style.alignItems = 'baseline';

    const zeroAnchor = document.createElement('span');
    zeroAnchor.style.display = 'inline-block';
    zeroAnchor.style.width = '0';
    zeroAnchor.style.height = '0';
    zeroAnchor.style.verticalAlign = 'baseline';

    const mathSpan = document.createElement('span');
    mathSpan.style.display = 'inline-block';
    // Tight padding to prevent clipping without creating giant whitespace in PDF
    mathSpan.style.padding = '3px 2px';
    mathSpan.style.color = color;
    mathSpan.style.backgroundColor = 'transparent';
    mathSpan.style.fontSize = '24px';
    mathSpan.style.lineHeight = 'normal';
    mathSpan.style.overflow = 'visible';

    katex.render(trimmed, mathSpan, {
      throwOnError: false,
      displayMode: false,
      minRuleThickness: 0.08,
      output: 'html',
    });

    flexWrap.appendChild(zeroAnchor);
    flexWrap.appendChild(mathSpan);
    container.appendChild(flexWrap);
    document.body.appendChild(container);

    if (typeof document !== 'undefined' && document.fonts) {
      await document.fonts.ready;
    }

    // 1. Transform KaTeX fractions (\frac) from KaTeX's broken table/vlist coordinates
    // to a clean flex column layout so html2canvas renders numerator, fraction bar, and denominator with zero overlap
    Array.from(mathSpan.querySelectorAll<HTMLElement>('.mfrac')).reverse().forEach(mfrac => {
      const fracLine = mfrac.querySelector<HTMLElement>('.frac-line');
      if (!fracLine) return;

      const fracLineContainer = fracLine.parentElement;
      const vlist = fracLineContainer?.parentElement;
      if (!vlist || !fracLineContainer) return;

      const children = Array.from(vlist.children) as HTMLElement[];
      const fracLineIdx = children.indexOf(fracLineContainer);
      if (fracLineIdx === -1) return;

      // In KaTeX vlist:
      // children before fracLine is denominator (index 0)
      // children after fracLine is numerator (index 2)
      const denomContainers = children.slice(0, fracLineIdx);
      const numContainers = children.slice(fracLineIdx + 1);

      // Clean denominator container
      denomContainers.forEach(c => {
        c.style.position = 'static';
        c.style.top = '0';
        c.style.height = 'auto';
        c.style.display = 'block';
        c.style.textAlign = 'center';
        c.style.lineHeight = 'normal';
        c.style.paddingTop = '2px';
        c.querySelectorAll<HTMLElement>('.pstrut').forEach(p => (p.style.display = 'none'));
      });

      // Clean numerator container
      numContainers.forEach(c => {
        c.style.position = 'static';
        c.style.top = '0';
        c.style.height = 'auto';
        c.style.display = 'block';
        c.style.textAlign = 'center';
        c.style.lineHeight = 'normal';
        c.style.paddingBottom = '2px';
        c.querySelectorAll<HTMLElement>('.pstrut').forEach(p => (p.style.display = 'none'));
      });

      // Format fraction bar as solid visible line
      fracLineContainer.style.position = 'static';
      fracLineContainer.style.top = '0';
      fracLineContainer.style.height = 'auto';
      fracLineContainer.style.display = 'block';
      fracLineContainer.style.width = '100%';
      fracLineContainer.style.padding = '0';
      fracLineContainer.style.margin = '2px 0';
      fracLineContainer.style.lineHeight = 'normal';
      fracLineContainer.querySelectorAll<HTMLElement>('.pstrut').forEach(p => (p.style.display = 'none'));

      fracLine.style.display = 'block';
      fracLine.style.width = '100%';
      fracLine.style.minWidth = '14px';
      fracLine.style.height = '2px';
      fracLine.style.minHeight = '2px';
      fracLine.style.backgroundColor = color;
      fracLine.style.border = 'none';
      fracLine.style.margin = '2px 0';
      fracLine.style.opacity = '1';

      // Create pure flex column: Numerator on top, bar in middle, denominator on bottom
      const flexWrapper = document.createElement('span');
      flexWrapper.style.display = 'inline-flex';
      flexWrapper.style.flexDirection = 'column';
      flexWrapper.style.verticalAlign = 'middle';
      flexWrapper.style.alignItems = 'stretch';
      flexWrapper.style.justifyContent = 'center';
      flexWrapper.style.padding = '0 3px';
      flexWrapper.style.margin = '0 1px';

      // 1. Numerator on top
      numContainers.forEach(c => flexWrapper.appendChild(c));
      // 2. Fraction line in middle
      flexWrapper.appendChild(fracLineContainer);
      // 3. Denominator on bottom
      denomContainers.forEach(c => flexWrapper.appendChild(c));

      mfrac.innerHTML = '';
      mfrac.style.display = 'inline-block';
      mfrac.style.verticalAlign = 'middle';
      mfrac.appendChild(flexWrapper);
    });

    // Fallback for any standalone frac-line
    mathSpan.querySelectorAll<HTMLElement>('.frac-line').forEach(el => {
      el.style.display = 'block';
      el.style.width = '100%';
      el.style.minWidth = '14px';
      el.style.height = '2px';
      el.style.minHeight = '2px';
      el.style.backgroundColor = color;
      el.style.border = 'none';
      el.style.margin = '2px 0';
      el.style.opacity = '1';
    });

    // 2. Fix superscripts and subscripts (\msupsub) so x^2 and a_1 don't displace vertically
    mathSpan.querySelectorAll<HTMLElement>('.msupsub').forEach(msupsub => {
      const vlist = msupsub.querySelector<HTMLElement>('.vlist');
      if (!vlist) return;

      const children = Array.from(vlist.children) as HTMLElement[];
      children.forEach(c => {
        c.querySelectorAll<HTMLElement>('.pstrut').forEach(p => (p.style.display = 'none'));
        c.style.position = 'static';
        c.style.top = '0';
        c.style.display = 'inline-block';
        c.style.height = 'auto';
        c.style.lineHeight = 'normal';
      });

      if (children.length === 1) {
        const item = children[0];
        const isSup = (item.getAttribute('style') || '').includes('top:-') || !msupsub.classList.contains('sub');
        msupsub.style.display = 'inline-block';
        msupsub.style.position = 'relative';
        msupsub.style.verticalAlign = isSup ? 'super' : 'sub';
        msupsub.style.fontSize = '0.7em';
        msupsub.style.lineHeight = '0';
        msupsub.style.top = isSup ? '-0.45em' : '0.25em';
        msupsub.style.marginLeft = '1px';

        const wrapper = msupsub.querySelector<HTMLElement>('.vlist-t') || vlist;
        wrapper.style.display = 'inline-block';
        wrapper.style.height = 'auto';
        vlist.style.display = 'inline-block';
        vlist.style.height = 'auto';
      } else if (children.length >= 2) {
        msupsub.style.display = 'inline-flex';
        msupsub.style.flexDirection = 'column-reverse';
        msupsub.style.verticalAlign = 'middle';
        msupsub.style.fontSize = '0.7em';
        msupsub.style.lineHeight = '1';
        msupsub.style.marginLeft = '1px';
        vlist.style.display = 'contents';
      }
    });

    // 2. Fix square roots (\sqrt) and radical overline
    mathSpan.querySelectorAll<HTMLElement>('.mord.sqrt').forEach(sqrtEl => {
      const svgAlign = sqrtEl.querySelector<HTMLElement>('.svg-align');
      const radicand = svgAlign?.querySelector<HTMLElement>('.mord');
      if (radicand) {
        radicand.style.borderTop = `1.5px solid ${color}`;
        radicand.style.display = 'inline-block';
        radicand.style.paddingTop = '1px';
      }

      const hideTail = sqrtEl.querySelector<HTMLElement>('.hide-tail');
      const svg = hideTail?.querySelector<SVGElement>('svg');
      if (hideTail && svg) {
        svg.setAttribute('fill', color);
        svg.setAttribute('stroke', color);
        svg.style.fill = color;
        svg.style.stroke = color;
        svg.querySelectorAll('path').forEach(p => {
          p.setAttribute('fill', color);
          p.style.fill = color;
        });
      }
    });

    // 3. Ensure all SVGs and path elements have explicit fill and stroke
    mathSpan.querySelectorAll('svg').forEach(svg => {
      svg.setAttribute('fill', color);
      svg.setAttribute('stroke', color);
      svg.style.fill = color;
      svg.style.stroke = color;
      svg.querySelectorAll('path').forEach(path => {
        path.setAttribute('fill', color);
        path.style.fill = color;
      });
    });

    // Use scale:4 for sharper output; html2canvas renders at device scale
    const CANVAS_SCALE = 4;
    const canvas = await html2canvas(mathSpan, {
      backgroundColor: null,
      scale: CANVAS_SCALE,
      logging: false,
      // DO NOT pass explicit width/height — KaTeX fractions render with overflow:visible
      // and the denominator extends BELOW getBoundingClientRect(). Passing explicit height
      // would clip the canvas exactly at the bounding rect, cutting off the denominator.
    });

    const dataUrl = canvas.toDataURL('image/png');

    const rect = mathSpan.getBoundingClientRect();
    const anchorRect = zeroAnchor.getBoundingClientRect();

    // Use canvas pixel dimensions — more reliable than getBoundingClientRect for overflow content
    const pixelWidth = canvas.width / CANVAS_SCALE;
    const pixelHeight = canvas.height / CANVAS_SCALE;

    // Distance from top of mathSpan (including top padding) to typographic baseline
    const baselinePx = anchorRect.bottom - rect.top;
    const baselineRatio = Math.max(0.15, Math.min(0.85, baselinePx / (pixelHeight || 1)));

    // Scaling to match PDF font size:
    // In DOM, font size is 24px. 1pt = 0.35278mm.
    const mmPerPixel = (fontSizePt * 0.35278) / 24;
    const widthMm = Math.max(pixelWidth * mmPerPixel, 2);
    const heightMm = Math.max(pixelHeight * mmPerPixel, 2);

    const result = { dataUrl, widthMm, heightMm, baselineRatio };
    mathImageCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('Failed to render KaTeX formula to image with html2canvas:', err);
    return null;
  } finally {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

async function resolveMathSegments(
  segments: FormattedTextSegment[],
  color: string,
  fontSizePt: number
): Promise<void> {
  for (const seg of segments) {
    if (seg.isMath && seg.latex) {
      const img = await renderMathToImage(seg.latex, color, fontSizePt);
      if (img) {
        seg.mathImg = img.dataUrl;
        seg.mathWidth = img.widthMm;
        seg.mathHeight = img.heightMm;
        seg.baselineRatio = img.baselineRatio;
      }
    }
  }
}

function parseHtmlToFormattedText(html: string): FormattedTextSegment[] {
  if (!html) return [];
  
  const segments: FormattedTextSegment[] = [];
  const stack: Partial<FormattedTextSegment>[] = [];
  
  let text = html
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  const tagRegex = /<\/?([a-z0-9-]+)(?:\s[^>]*)?>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const pushPlainText = (str: string) => {
    if (!str) return;
    const mathRegex = /\$([^\$]+)\$/g;
    let textLastIdx = 0;
    let mMatch: RegExpExecArray | null;

    while ((mMatch = mathRegex.exec(str)) !== null) {
      if (mMatch.index > textLastIdx) {
        const subText = str.substring(textLastIdx, mMatch.index);
        if (subText) {
          segments.push({
            text: subText,
            bold: stack.some(s => s.bold),
            italic: stack.some(s => s.italic),
            underline: stack.some(s => s.underline),
            strike: stack.some(s => s.strike),
            sup: stack.some(s => s.sup),
            sub: stack.some(s => s.sub),
            code: stack.some(s => s.code),
            listItem: stack.some(s => s.listItem),
          });
        }
      }

      const latex = (mMatch && mMatch[1] ? mMatch[1] : '').trim();
      segments.push({
        text: convertLatexToFallbackUnicode(latex),
        bold: false,
        italic: false,
        underline: false,
        strike: false,
        sup: false,
        sub: false,
        code: false,
        listItem: false,
        isMath: true,
        latex,
      });

      textLastIdx = mMatch.index + mMatch[0].length;
    }

    if (textLastIdx < str.length) {
      const rest = str.substring(textLastIdx);
      if (rest) {
        segments.push({
          text: rest,
          bold: stack.some(s => s.bold),
          italic: stack.some(s => s.italic),
          underline: stack.some(s => s.underline),
          strike: stack.some(s => s.strike),
          sup: stack.some(s => s.sup),
          sub: stack.some(s => s.sub),
          code: stack.some(s => s.code),
          listItem: stack.some(s => s.listItem),
        });
      }
    }
  };
  
  while ((match = tagRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const plainText = text.substring(lastIndex, match.index);
      pushPlainText(plainText);
    }
    
    const tagName = match[1]?.toLowerCase() || '';
    const isClosing = match[0].startsWith('</');
    
    if (tagName === 'p' || tagName === 'br') {
      if (isClosing || tagName === 'br') {
        segments.push({
          text: '', bold: false, italic: false, underline: false, strike: false,
          sup: false, sub: false, code: false, listItem: false,
        });
      }
      lastIndex = match.index + match[0].length;
      continue;
    }

    if (tagName === 'span' && !isClosing) {
      const dataMatch = match[0].match(/data-latex="([^"]+)"/);
      if (dataMatch) {
        const latex = dataMatch[1] ?? '';
        segments.push({
          text: convertLatexToFallbackUnicode(latex),
          bold: false,
          italic: false,
          underline: false,
          strike: false,
          sup: false,
          sub: false,
          code: false,
          listItem: false,
          isMath: true,
          latex,
        });

        // Skip internal KaTeX DOM spans inside this math element
        const restOfText = text.substring(match.index + match[0].length);
        const closeSpanIdx = restOfText.indexOf('</span>');
        if (closeSpanIdx !== -1) {
          lastIndex = match.index + match[0].length + closeSpanIdx + 7;
          tagRegex.lastIndex = lastIndex;
        } else {
          lastIndex = match.index + match[0].length;
        }
        continue;
      }
    }

    if (isClosing) {
      const index = stack.findIndex(s => s[tagName as keyof FormattedTextSegment] === true);
      if (index !== -1) {
        stack.splice(index, 1);
      }
    } else {
      const formatting: Partial<FormattedTextSegment> = {};
      if (tagName === 'b' || tagName === 'strong') formatting.bold = true;
      if (tagName === 'i' || tagName === 'em') formatting.italic = true;
      if (tagName === 'u') formatting.underline = true;
      if (tagName === 's' || tagName === 'strike') formatting.strike = true;
      if (tagName === 'sup') formatting.sup = true;
      if (tagName === 'sub') formatting.sub = true;
      if (tagName === 'code') formatting.code = true;
      if (tagName === 'li') formatting.listItem = true;
      if (tagName === 'ul') formatting.listItem = true;
      stack.push(formatting);
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < text.length) {
    const plainText = text.substring(lastIndex);
    pushPlainText(plainText);
  }
  
  return segments;
}

function estimateSegmentsHeight(
  doc: typeof jsPDF.prototype,
  segments: FormattedTextSegment[],
  width: number,
  lineHeight: number
): number {
  let totalHeight = 0;
  let currentLineWidth = 0;
  let currentLineHeight = lineHeight;
  const spaceWidth = doc.getTextWidth(' ');

  const wrapLine = () => {
    totalHeight += currentLineHeight;
    currentLineWidth = 0;
    currentLineHeight = lineHeight;
  };

  segments.forEach(seg => {
    if (seg.text === '' && !seg.isMath) {
      wrapLine();
      return;
    }

    if (seg.isMath && seg.mathWidth) {
      let mWidth = seg.mathWidth;
      let mHeight = seg.mathHeight || 0;
      if (mWidth > width) {
        const scale = width / mWidth;
        mWidth = width;
        mHeight = mHeight * scale;
      }
      if (currentLineWidth + mWidth > width && currentLineWidth > 0) {
        wrapLine();
      }
      currentLineWidth += mWidth + spaceWidth * 0.3;
      if (mHeight && mHeight > currentLineHeight) {
        currentLineHeight = Math.max(currentLineHeight, mHeight + 3.0);
      }
      return;
    }

    const words = seg.text.split(/\s+/).filter(w => w.length > 0);
    words.forEach(word => {
      const wordWidth = doc.getTextWidth(word);
      if (currentLineWidth + wordWidth > width && currentLineWidth > 0) {
        wrapLine();
      }
      currentLineWidth += wordWidth + spaceWidth;
    });
  });

  if (currentLineWidth > 0) {
    totalHeight += currentLineHeight;
  }

  return Math.max(totalHeight, lineHeight);
}

function renderFormattedText(
  doc: typeof jsPDF.prototype,
  segments: FormattedTextSegment[],
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  activeFont: string,
  rgb: { r: number; g: number; b: number },
  fontSizePt: number = 10
): { newY: number } {
  let currentX = x;
  let currentY = y;
  const rightEdge = x + maxWidth;
  const spaceWidth = doc.getTextWidth(' ');
  let wroteAnything = false;
  let maxDescender = Math.max(lineHeight * 0.25, 1.0);

  const applyFont = (segment: FormattedTextSegment, text: string = '') => {
    if (segment.code) {
      doc.setFont('Courier', 'normal');
      doc.setFontSize(fontSizePt);
      return;
    }
    
    // Check if text contains Devanagari characters
    const hasDevanagari = text ? containsDevanagari(text) : false;
    
    const fontStyle = [];
    if (segment.bold) fontStyle.push('bold');
    if (segment.italic) fontStyle.push('italic');
    const style = fontStyle.length > 0 ? fontStyle.join('') : 'normal';
    
    if (hasDevanagari) {
      const devanagariStyle = style === 'italic' ? 'normal' : style;
      doc.setFont('NotoSansDevanagari', devanagariStyle);
    } else {
      doc.setFont(activeFont, style);
    }
    doc.setFontSize(fontSizePt);
  };

  segments.forEach(segment => {
    // If it's a rendered math formula image
    if (segment.isMath && segment.mathImg && segment.mathWidth && segment.mathHeight) {
      let mWidth = segment.mathWidth;
      let mHeight = segment.mathHeight;
      const bRatio = segment.baselineRatio ?? 0.55;

      // 1. If formula does not fit on current line and we have already drawn something on this line, wrap
      if (currentX > x && currentX + mWidth > rightEdge) {
        currentY += Math.max(lineHeight, maxDescender + (lineHeight * 0.6));
        currentX = x;
        maxDescender = Math.max(lineHeight * 0.25, 1.0);
      }

      // 2. If formula is wider than the allowed text width (maxWidth), scale it down proportionally
      // so it never spills over past rightEdge and never overlaps question images or page margins
      if (mWidth > maxWidth) {
        const scale = maxWidth / mWidth;
        mWidth = maxWidth;
        mHeight = mHeight * scale;
      }

      // Draw image so that the baseline of the math aligns with the text baseline (currentY).
      const aboveBaseline = mHeight * bRatio;
      const yDraw = currentY - aboveBaseline;
      try {
        doc.addImage(segment.mathImg, 'PNG', currentX, yDraw, mWidth, mHeight);
      } catch (e) {
        console.warn('Failed to draw math image in PDF, fallback to text:', e);
        doc.text(segment.text, currentX, currentY);
      }

      // Track how far below baseline the image extends
      const mathDescender = mHeight - aboveBaseline;
      if (mathDescender > maxDescender) {
        maxDescender = mathDescender;
      }

      currentX += mWidth + (spaceWidth * 0.3);
      wroteAnything = true;
      return;
    }

    if (segment.text === '') {
      currentY += Math.max(lineHeight, maxDescender + 1.5);
      currentX = x;
      maxDescender = Math.max(lineHeight * 0.25, 1.0);
      wroteAnything = false;
      return;
    }

    let textToRender = segment.text;
    if (segment.listItem) {
      if (wroteAnything) {
        currentY += Math.max(lineHeight, maxDescender + 1.5);
        currentX = x;
        maxDescender = Math.max(lineHeight * 0.25, 1.0);
      }
      textToRender = '• ' + textToRender;
    }

    applyFont(segment, textToRender);

    const words = textToRender.split(/\s+/).filter((w: string) => w.length > 0);

    words.forEach((word: string) => {
      // Check each word for Devanagari and switch font if needed
      const wordHasDevanagari = containsDevanagari(word);
      const fontStyle = [];
      if (segment.bold) fontStyle.push('bold');
      if (segment.italic) fontStyle.push('italic');
      const style = fontStyle.length > 0 ? fontStyle.join('') : 'normal';

      if (wordHasDevanagari) {
        const devanagariStyle = style === 'italic' ? 'normal' : style;
        doc.setFont('NotoSansDevanagari', devanagariStyle);
      } else {
        doc.setFont(activeFont, style);
      }
      doc.setFontSize(fontSizePt);
      
      const wordWidth = doc.getTextWidth(word);
      if (currentX > x && currentX + wordWidth > rightEdge) {
        currentY += Math.max(lineHeight, maxDescender + (lineHeight * 0.6));
        currentX = x;
        maxDescender = Math.max(lineHeight * 0.25, 1.0);
      }

      const drawX = currentX;
      if (segment.sup) {
        doc.setFontSize(fontSizePt * 0.65);
        doc.text(word, drawX, currentY - (fontSizePt * 0.15));
        doc.setFontSize(fontSizePt);
      } else if (segment.sub) {
        doc.setFontSize(fontSizePt * 0.65);
        doc.text(word, drawX, currentY + (fontSizePt * 0.15));
        doc.setFontSize(fontSizePt);
      } else {
        doc.text(word, drawX, currentY);
      }

      if (segment.underline) {
        doc.setDrawColor(rgb.r, rgb.g, rgb.b);
        doc.setLineWidth(0.1);
        doc.line(drawX, currentY + 0.5, drawX + wordWidth, currentY + 0.5);
      }

      currentX += wordWidth + spaceWidth;
      wroteAnything = true;
    });
  });

  if (wroteAnything) {
    // Leave clean clearance below formula descenders on this line
    currentY += Math.max(lineHeight, maxDescender + 1.0);
  }

  doc.setFont(activeFont, 'normal');
  doc.setFontSize(fontSizePt);
  doc.setDrawColor(rgb.r, rgb.g, rgb.b);

  return { newY: currentY };
}

function buildSuffixSegments(question: { subject?: string; hint?: string }): FormattedTextSegment[] {
  const suffixSegments: FormattedTextSegment[] = [];
  if (question.subject) {
    suffixSegments.push({
      text: `[Topic: ${question.subject}]`,
      bold: false, italic: true, underline: false, strike: false,
      sup: false, sub: false, code: false, listItem: false,
    });
  }
  if (question.hint) {
    console.log('RAW HINT:', JSON.stringify(question.hint));
    suffixSegments.push({
      text: `[Hint: ${question.hint}]`,
      bold: false, italic: true, underline: false, strike: false,
      sup: false, sub: false, code: false, listItem: false,
    });
  }
  return suffixSegments;
}

async function buildOptionRenderData(
  doc: typeof jsPDF.prototype,
  options: Array<{ text: string; isCorrect?: boolean } | string>,
  availableWidth: number,
  activeFont: string,
  fontSize: number,
  lineHeight: number,
  fontColor: string
): Promise<OptionRenderData[]> {
  doc.setFont(activeFont, 'bold');
  doc.setFontSize(fontSize);

  const results: OptionRenderData[] = [];
  for (let oIndex = 0; oIndex < options.length; oIndex++) {
    const opt = options[oIndex];
    if (!opt) continue;

    const optPrefix = `${String.fromCharCode(97 + oIndex)}) `;
    const prefixWidth = doc.getTextWidth(optPrefix);
    let rawText = typeof opt === 'string' ? opt : (opt.text || '');

    // If text contains LaTeX commands without dollar delimiters, wrap them in $...$
    if (!rawText.includes('$') && /\\[a-zA-Z]+/.test(rawText)) {
      rawText = rawText.replace(/(\\[a-zA-Z]+(?:\{[^{}]*\}|\[[^[\]]*\])*)/g, '$$$1$$');
    }

    const segments = parseHtmlToFormattedText(rawText);
    await resolveMathSegments(segments, fontColor, fontSize);

    const contentWidth = Math.max(availableWidth - prefixWidth, 10);
    const height = estimateSegmentsHeight(doc, segments, contentWidth, lineHeight);

    results.push({
      prefix: optPrefix,
      prefixWidth,
      segments,
      height,
    });
  }
  return results;
}

function render2ColOptions(
  doc: typeof jsPDF.prototype,
  options: OptionRenderData[],
  x: number,
  startY: number,
  optColWidth: number,
  colGap: number,
  lineHeight: number,
  activeFont: string,
  rgb: { r: number; g: number; b: number },
  fontSize: number
): number {
  const col1X = x;
  const col2X = x + optColWidth + colGap;

  let currentY = startY;

  for (let i = 0; i < options.length; i += 2) {
    const leftOpt = options[i];
    const rightOpt = options[i + 1];

    let rowEndY = currentY + lineHeight;

    if (leftOpt) {
      doc.setFont(activeFont, 'bold');
      doc.setFontSize(fontSize);
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      doc.text(leftOpt.prefix, col1X, currentY);

      const { newY } = renderFormattedText(
        doc,
        leftOpt.segments,
        col1X + leftOpt.prefixWidth,
        currentY,
        Math.max(optColWidth - leftOpt.prefixWidth, 10),
        lineHeight,
        activeFont,
        rgb,
        fontSize
      );
      rowEndY = Math.max(rowEndY, newY);
    }

    if (rightOpt) {
      doc.setFont(activeFont, 'bold');
      doc.setFontSize(fontSize);
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      doc.text(rightOpt.prefix, col2X, currentY);

      const { newY } = renderFormattedText(
        doc,
        rightOpt.segments,
        col2X + rightOpt.prefixWidth,
        currentY,
        Math.max(optColWidth - rightOpt.prefixWidth, 10),
        lineHeight,
        activeFont,
        rgb,
        fontSize
      );
      rowEndY = Math.max(rowEndY, newY);
    }

    // Move to next row: newY from renderFormattedText already advances to the next line baseline cleanly without extra gap
    currentY = rowEndY;
  }

  return currentY;
}

function renderSingleColOptions(
  doc: typeof jsPDF.prototype,
  options: OptionRenderData[],
  x: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
  activeFont: string,
  rgb: { r: number; g: number; b: number },
  fontSize: number
): number {
  let currentY = startY;

  options.forEach((opt) => {
    doc.setFont(activeFont, 'bold');
    doc.setFontSize(fontSize);
    doc.setTextColor(rgb.r, rgb.g, rgb.b);
    doc.text(opt.prefix, x, currentY);

    const { newY } = renderFormattedText(
      doc,
      opt.segments,
      x + opt.prefixWidth,
      currentY,
      Math.max(maxWidth - opt.prefixWidth, 10),
      lineHeight,
      activeFont,
      rgb,
      fontSize
    );

    currentY = newY + 1.0;
  });

  return currentY;
}

function insertInstructionLineBreaks(instructions: string): string {
  return instructions.replace(/\s(?=\d+\))/g, '<br>');
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) {
    return `${hours} hr ${mins} min`;
  } else if (hours > 0) {
    return `${hours} hr`;
  } else {
    return `${mins} min`;
  }
}

function estimateQuestionHeightQuick(
  doc: typeof jsPDF.prototype,
  question: any,
  colWidth: number,
  lineHeight: number
): number {
  if (!question) return 0;

  // Matching
  if (question.segmentType === 'MATCHING') {
    const pairCount = (question.matchingPairs || []).length || 4;
    return pairCount * (lineHeight * 1.1) + 16;
  }

  // Passage
  if (question.segmentType === 'PASSAGE') {
    const cleanPassage = (question.passageText || '').replace(/<[^>]+>/g, ' ');
    const passageLines = doc.splitTextToSize(cleanPassage || 'Passage', Math.max(colWidth - 8, 20)).length;
    const sqCount = (question.subQuestions || []).length || 2;
    return passageLines * lineHeight + sqCount * (lineHeight + 3) + 16;
  }

  // Assertion Reasoning
  if (question.segmentType === 'ASSERTION_REASONING') {
    const aText = (question.assertion || '').replace(/<[^>]+>/g, ' ');
    const rText = (question.reason || '').replace(/<[^>]+>/g, ' ');
    const aLines = doc.splitTextToSize(aText, Math.max(colWidth - 8, 20)).length;
    const rLines = doc.splitTextToSize(rText, Math.max(colWidth - 8, 20)).length;
    return (aLines + rLines) * lineHeight + lineHeight * 4 + 12;
  }

  // Standard / MCQ
  const cleanQ = (question.questionText || '').replace(/<[^>]+>/g, ' ');
  const qLines = Math.max(1, doc.splitTextToSize(`Q. ${cleanQ}`, Math.max(colWidth - 5, 20)).length);
  let h = qLines * lineHeight;

  if (question.subject || question.hint) {
    h += 4.5;
  }

  const isMCQ = question.segmentType === 'MCQ' || (question.options && question.options.length > 0);
  if (isMCQ && question.options && question.options.length > 0) {
    const optCount = question.options.length;
    const rows = Math.ceil(optCount / 2);
    h += rows * (lineHeight + 1.5) + 3;
  }

  if (question.imageUrl) {
    h = Math.max(h, 28);
  }

  h += QUESTION_GAP;

  if (question.alternatives && question.alternatives.length > 0) {
    for (const alt of question.alternatives) {
      const cleanAlt = (alt.questionText || '').replace(/<[^>]+>/g, ' ');
      const altLines = Math.max(1, doc.splitTextToSize(cleanAlt, Math.max(colWidth - 5, 20)).length);
      h += altLines * lineHeight + 6;
      if (alt.options && alt.options.length > 0) {
        h += Math.ceil(alt.options.length / 2) * (lineHeight + 1.5) + 3;
      }
    }
  }

  return h;
}

export async function generateExamPaperPdf(paper: PdfPaperData, rollNumber?: string): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Load Devanagari font for Hindi text support
  loadDevanagariFont(doc);

  const rawFontSize = parseFloat((paper.styleFontSize || '11').replace(/[^\d.]/g, '')) || 11;
  const baseFontSize = Math.min(Math.max(rawFontSize, 8), 24);
  const LINE_HEIGHT = Math.max(3.8, (baseFontSize * 0.3528) * 1.25);
  const optFontSize = Math.max(baseFontSize - 1.5, 8);
  const optLineHeight = Math.max(3.5, (optFontSize * 0.3528) * 1.20);
  const subQFontSize = Math.max(baseFontSize - 1.0, 8.5);
  const subQLineHeight = Math.max(3.6, (subQFontSize * 0.3528) * 1.22);

  const requestedFont = paper.styleFontFamily || 'Times New Roman';
  const activeFont = await ensureCustomFontLoaded(doc, requestedFont);
  const fontColor = paper.styleColor || '#000000';

  const PAGE_WIDTH = 210;
  const PAGE_HEIGHT = 297;

  const hexToRgb = (hex: string) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result ? {
      r: parseInt(result[1] || '00', 16),
      g: parseInt(result[2] || '00', 16),
      b: parseInt(result[3] || '00', 16)
    } : { r: 0, g: 0, b: 0 };
  };

  const rgb = hexToRgb(fontColor);
  let currentPage = 1;

  const pageContentStartY: Record<number, number> = { 1: 72 };
  const CONTENT_END_Y = 283; 

  const WATERMARK_SIZE = 90;
  const WATERMARK_X = (PAGE_WIDTH - WATERMARK_SIZE) / 2;
  const WATERMARK_Y = (PAGE_HEIGHT - WATERMARK_SIZE) / 2;

  const setupPage = async (pDoc: typeof doc, pNum: number) => {
    if (paper.logoUrl) {
      pDoc.saveGraphicsState();
      try {
        // @ts-ignore
        pDoc.setGState(new pDoc.GState({ opacity: 0.035 }));
      } catch {
        pDoc.setTextColor(240, 240, 240); 
      }
      try {
        const logoBase64 = await fetchImageAsBase64(paper.logoUrl);
        pDoc.addImage(logoBase64, 'PNG', WATERMARK_X, WATERMARK_Y, WATERMARK_SIZE, WATERMARK_SIZE);
      } catch (e) {
        console.warn('Failed to load logo watermark:', e);
      }
      pDoc.restoreGraphicsState();
    }

    pDoc.setTextColor(rgb.r, rgb.g, rgb.b);

    pDoc.setFont('Helvetica', 'normal');
    pDoc.setFontSize(8);
    pDoc.setTextColor(120, 120, 120);
    pDoc.text(`Page ${pNum}`, 105, 287, { align: 'center' });
    pDoc.text('Syllabus Tracker', 195, 287, { align: 'right' });
    pDoc.setTextColor(rgb.r, rgb.g, rgb.b);
  };

  const drawPageHeader = async (pDoc: typeof doc, pRoll?: string) => {
    pDoc.setLineWidth(0.3);
    pDoc.setDrawColor(180, 180, 180);
    pDoc.rect(15, 15, 180, 32);

    if (paper.logoUrl) {
      try {
        const logoBase64 = await fetchImageAsBase64(paper.logoUrl);
        pDoc.addImage(logoBase64, 'PNG', 18, 18, 20, 20);
      } catch (e) {
        console.warn('Failed to load logo:', e);
      }
    }

    const logoOffset = paper.logoUrl ? 25 : 0;
    pDoc.setFont(activeFont, 'bold');
    pDoc.setFontSize(14);
    pDoc.text(paper.schoolName || 'SCHOOL ACADEMIC PORTAL', 105 + logoOffset / 2, 22, { align: 'center' });

    pDoc.setFontSize(11);
    pDoc.text(paper.examName || 'EXAMINATION QUESTION PAPER', 105 + logoOffset / 2, 28, { align: 'center' });

    pDoc.setFont(activeFont, 'normal');
    pDoc.setFontSize(9);
    const dateStr = paper.examDate ? new Date(paper.examDate).toLocaleDateString() : null;
    const shouldShowTeacher = paper.showTeacherName !== false && Boolean(paper.teacherName);
    const teacherNameStr = shouldShowTeacher ? `Teacher: ${paper.teacherName}` : '';
    const rawClass = (paper.className || 'N/A').trim();
    const classDisplay = rawClass.replace(/^class:\s*/i, '');
    const infoParts = [classDisplay, `Subject: ${paper.subjectName || 'N/A'}`];
    if (dateStr) infoParts.push(`Date: ${dateStr}`);
    if (teacherNameStr) infoParts.push(teacherNameStr);
    pDoc.text(infoParts.join('    |    '), 105 + logoOffset / 2, 35, { align: 'center' });
    pDoc.text(`Duration: ${formatDuration(paper.duration || 0)}    |    Total Marks: ${paper.totalMarks || 0} Marks`, 105 + logoOffset / 2, 41, { align: 'center' });

    pDoc.rect(15, 52, 180, 12);
    pDoc.setFont(activeFont, 'bold');
    pDoc.setFontSize(9);
    pDoc.text('Student Name: _____________________________________', 18, 60);
    pDoc.text(`Roll Number: ${pRoll || '__________________'}`, 132, 60);
  };

  await setupPage(doc, currentPage);
  await drawPageHeader(doc, rollNumber);

  let colWidth = paper.templateType === 'SPLIT' ? 85 : 180;
  let bottomMargin = 22;
  let currentColumn = 0; 
  let y = 72;
  const maxPageY: Record<number, number> = {};

  const getX = () => {
    if (paper.templateType === 'SPLIT') {
      return currentColumn === 0 ? 15 : 110;
    }
    return 15;
  };

  const getCenterX = () => {
    if (paper.templateType === 'SPLIT') {
      return currentColumn === 0 ? 57.5 : 152.5;
    }
    return 105;
  };

  if (paper.instructions) {
    const instructionsWithBreaks = insertInstructionLineBreaks(paper.instructions);
    const formattedInstructions = parseHtmlToFormattedText(instructionsWithBreaks);
    await resolveMathSegments(formattedInstructions, fontColor, Math.max(baseFontSize - 1, 9));
    const instWidth = paper.templateType === 'SPLIT' ? 180 : colWidth;

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(Math.max(baseFontSize - 0.5, 9.5));
    doc.text('General Instructions:', 15, y);
    y += 5;

    doc.setFont(activeFont, 'normal');
    doc.setFontSize(Math.max(baseFontSize - 1, 9));

    const { newY: afterInstructionsY } = renderFormattedText(
      doc,
      formattedInstructions,
      15,
      y,
      instWidth,
      LINE_HEIGHT,
      activeFont,
      rgb,
      Math.max(baseFontSize - 1, 9)
    );
    y = afterInstructionsY + 4;
    if (paper.templateType === 'SPLIT') {
      pageContentStartY[1] = y;
    }
    maxPageY[1] = y;
  }

  // Pre-calculate total content height to enable balanced 2-column layout in SPLIT mode
  let totalContentHeight = 0;
  for (const section of paper.sections) {
    if (!section) continue;
    totalContentHeight += 12;

    if (section.segments && section.segments.length > 0) {
      let isFirst = true;
      for (const segment of section.segments) {
        const segQuestions = (section.questions || []).filter((q: any) => q.segmentType === segment.type);
        if (segQuestions.length === 0) continue;

        totalContentHeight += isFirst ? 10 : (SEGMENT_BEFORE_GAP + 10);
        isFirst = false;

        if (segment.type === 'ASSERTION_REASONING') {
          totalContentHeight += 32;
        }

        for (const q of segQuestions) {
          totalContentHeight += estimateQuestionHeightQuick(doc, q, colWidth, LINE_HEIGHT);
        }
      }
    } else if (section.questions && section.questions.length > 0) {
      for (const q of section.questions) {
        totalContentHeight += estimateQuestionHeightQuick(doc, q, colWidth, LINE_HEIGHT);
      }
    }
    totalContentHeight += SECTION_GAP;
  }

  const maxY = 297 - bottomMargin;
  const p1Start = pageContentStartY[1] ?? 72;
  const p1ColCapacity = maxY - p1Start;
  const p1TotalCapacity = p1ColCapacity * 2;

  let col0TargetHeight = p1ColCapacity;
  if (paper.templateType === 'SPLIT') {
    if (totalContentHeight <= p1TotalCapacity) {
      // Single-page SPLIT: balance evenly between Column 0 and Column 1
      col0TargetHeight = Math.min(
        p1ColCapacity - 10,
        Math.max(35, Math.ceil(totalContentHeight / 2) + 6)
      );
    } else {
      col0TargetHeight = p1ColCapacity;
    }
  }

  let remainingHeightAfterP1 = Math.max(0, totalContentHeight - p1TotalCapacity);

  const advanceCursor = async (requiredHeight: number) => {
    const pageMaxY = 297 - bottomMargin;
    const pageStartY = pageContentStartY[currentPage] ?? 24;
    const currentColCapacity = pageMaxY - pageStartY;

    let col0Limit = pageMaxY;
    if (paper.templateType === 'SPLIT' && currentColumn === 0) {
      if (currentPage === 1) {
        col0Limit = Math.min(pageMaxY, pageStartY + col0TargetHeight);
      } else {
        const pCapacity = currentColCapacity * 2;
        if (remainingHeightAfterP1 <= pCapacity) {
          const balancedTarget = Math.min(
            currentColCapacity - 10,
            Math.max(30, Math.ceil(remainingHeightAfterP1 / 2) + 6)
          );
          col0Limit = Math.min(pageMaxY, pageStartY + balancedTarget);
        } else {
          col0Limit = pageMaxY;
        }
      }
    }

    if (y + requiredHeight > (paper.templateType === 'SPLIT' && currentColumn === 0 ? col0Limit : pageMaxY)) {
      if (paper.templateType === 'SPLIT' && currentColumn === 0) {
        maxPageY[currentPage] = Math.max(maxPageY[currentPage] || 0, y);
        currentColumn = 1;
        y = pageContentStartY[currentPage] ?? 24; 
      } else {
        maxPageY[currentPage] = Math.max(maxPageY[currentPage] || 0, y);
        doc.addPage();
        currentPage++;
        await setupPage(doc, currentPage);

        doc.setFont(activeFont, 'italic');
        doc.setFontSize(8);
        doc.text(`${paper.examName} - ${paper.subjectName}`, 15, 12);
        if (rollNumber) {
          doc.text(`Roll Number: ${rollNumber}`, 195, 12, { align: 'right' });
        }
        doc.line(15, 14, 195, 14);

        currentColumn = 0;
        y = 24; 
        pageContentStartY[currentPage] = 24;
        remainingHeightAfterP1 = Math.max(0, remainingHeightAfterP1 - (currentColCapacity * 2));
      }
    }
  };

  const drawMiddleSplitLineForPage = (pageNum: number) => {
    if (paper.templateType !== 'SPLIT') return;
    const startY = pageNum === 1 ? (pageContentStartY[1] ?? 72) : 18;
    const recordedEnd = maxPageY[pageNum] ? maxPageY[pageNum] + 4 : CONTENT_END_Y;
    const endY = Math.min(CONTENT_END_Y, Math.max(recordedEnd, startY + 30));
    doc.setPage(pageNum);
    doc.setLineWidth(0.2);
    doc.setDrawColor(210, 215, 225);
    doc.line(105, startY, 105, endY);
    doc.setDrawColor(rgb.r, rgb.g, rgb.b); 
  };

  for (let sIndex = 0; sIndex < paper.sections.length; sIndex++) {
    const section = paper.sections[sIndex];
    if (!section) continue;

    // Ensure enough room for section title + segment header + first question (~26mm)
    // to prevent orphaned section headers or overlap near the bottom of a page
    await advanceCursor(26);

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(Math.max(baseFontSize + 1, 10.5));
    doc.text(section.label, getCenterX(), y, { align: 'center' });
    y += (section.segments && section.segments.length > 0) ? 5 : SECTION_LABEL_GAP;

    if (section.segments && section.segments.length > 0) {
      let isFirstRenderedSegment = true;
      for (const segment of section.segments) {
        // Find questions belonging to this segment
        const segmentQuestions = section.questions.filter((q: any) => q.segmentType === segment.type);

        // SKIP EMPTY SEGMENTS (Fixes overlapping segment headers)
        if (segmentQuestions.length === 0) continue;

        if (!isFirstRenderedSegment) {
          await advanceCursor(SEGMENT_BEFORE_GAP + 10);
          y += SEGMENT_BEFORE_GAP;
        } else {
          await advanceCursor(10);
        }
        isFirstRenderedSegment = false;

        doc.setFont(activeFont, 'bold');
        doc.setFontSize(Math.max(baseFontSize - 0.5, 9));
        const segmentLabel = `${segment.label} (${segment.questionCount} ${segment.questionCount === 1 ? 'question' : 'questions'} × ${segment.marksEach} ${segment.marksEach === 1 ? 'mark' : 'marks'} = ${segment.questionCount * segment.marksEach} marks)`;
        doc.text(segmentLabel, getX(), y);
        y += SEGMENT_HEADER_GAP;

        // Render instruction block for ASSERTION_REASONING segments
        if (segment.type === 'ASSERTION_REASONING' && segmentQuestions.length > 0) {
          const availableWidth = colWidth - 5;
          const instructionText = 'For each question, consider the Assertion (A) and the Reason (R). Then, choose the correct option from the following key:';
          const options = [
            'A) Both (A) and (R) are true, and (R) is the correct explanation of (A).',
            'B) Both (A) and (R) are true, but (R) is not the correct explanation of (A).',
            'C) (A) is true, but (R) is false.',
            'D) (A) is false, but (R) is true.',
            'E) Both (A) and (R) are false.'
          ];

          doc.setFont(activeFont, 'bold');
          doc.setFontSize(Math.max(baseFontSize - 1.5, 8.5));
          const instructionLines: string[] = doc.splitTextToSize(instructionText, availableWidth);

          doc.setFont(activeFont, 'normal');
          doc.setFontSize(Math.max(baseFontSize - 2, 8));
          const optionLinesArr: string[][] = options.map((option) => doc.splitTextToSize(option, availableWidth));
          const totalOptionLines = optionLinesArr.reduce((sum, lines) => sum + lines.length, 0);

          const blockHeight = (instructionLines.length + totalOptionLines) * LINE_HEIGHT + LINE_HEIGHT * 2;
          await advanceCursor(blockHeight);

          doc.setFont(activeFont, 'bold');
          doc.setFontSize(Math.max(baseFontSize - 1.5, 8.5));
          instructionLines.forEach((line: string) => {
            doc.text(line, getX(), y);
            y += LINE_HEIGHT;
          });
          y += LINE_HEIGHT * 0.5;

          doc.setFont(activeFont, 'normal');
          doc.setFontSize(Math.max(baseFontSize - 2, 8));
          optionLinesArr.forEach((lines: string[]) => {
            lines.forEach((line: string) => {
              doc.text(line, getX() + 3, y);
              y += LINE_HEIGHT;
            });
          });
          y += LINE_HEIGHT;
        }

        for (let qIndex = 0; qIndex < segmentQuestions.length; qIndex++) {
          const question = segmentQuestions[qIndex];
          if (!question) continue;

          const qPrefix = `Q${qIndex + 1}. `;

          doc.setFont(activeFont, 'bold');
          doc.setFontSize(baseFontSize);
          const qPrefixWidth = doc.getTextWidth(qPrefix);

          const hasImage = !!question.imageUrl;
          const maxBoxWidth = paper.templateType === 'SPLIT' ? 35 : 45;
          const maxBoxHeight = paper.templateType === 'SPLIT' ? 30 : 35;

          const textAreaWidth = colWidth - qPrefixWidth - (hasImage ? (maxBoxWidth + IMAGE_TEXT_GAP + IMAGE_RIGHT_MARGIN) : 0);

          // Handle MATCHING questions
          if (segment.type === 'MATCHING' || question.segmentType === 'MATCHING') {
            const rawQText = question.questionText?.trim() || 'Match the following items in Column A with Column B:';
            const formattedQText = parseHtmlToFormattedText(rawQText);
            await resolveMathSegments(formattedQText, fontColor, baseFontSize);
            const qTextHeight = estimateSegmentsHeight(doc, formattedQText, textAreaWidth, LINE_HEIGHT);

            const matchingPairs = (question.matchingPairs || []).filter((p: any) => (p.left && p.left.trim()) || (p.right && p.right.trim()));
            const pairCount = matchingPairs.length;

            const innerWidth = colWidth - 2;
            const singleColWidth = Math.floor((innerWidth - 6) / 2);
            const colA_X = getX() + 2;
            const colB_X = getX() + singleColWidth + 6;

            let pairsHeight = 0;
            if (pairCount > 0) {
              pairsHeight += LINE_HEIGHT * 1.3;
              for (const pair of matchingPairs) {
                const leftLines = doc.splitTextToSize(pair.left || '', singleColWidth - 8);
                const rightLines = doc.splitTextToSize(pair.right || '', singleColWidth - 8);
                const rowLines = Math.max(leftLines.length, rightLines.length, 1);
                pairsHeight += rowLines * subQLineHeight + 1.2;
              }
            }

            const totalMatchingHeight = qTextHeight + pairsHeight + 6;
            await advanceCursor(totalMatchingHeight);

            doc.setFont(activeFont, 'bold');
            doc.setFontSize(baseFontSize);
            doc.text(qPrefix, getX(), y);

            const { newY: afterQTextY } = renderFormattedText(
              doc,
              formattedQText,
              getX() + qPrefixWidth,
              y,
              textAreaWidth,
              LINE_HEIGHT,
              activeFont,
              rgb,
              baseFontSize
            );
            y = afterQTextY + 2;

            if (pairCount > 0) {
              doc.setFont(activeFont, 'bold');
              doc.setFontSize(subQFontSize);
              doc.text('Column A', colA_X, y);
              doc.text('Column B', colB_X, y);
              y += LINE_HEIGHT * 1.2;

              for (let i = 0; i < pairCount; i++) {
                const pair = matchingPairs[i];
                if (!pair) continue;
                const leftLabel = `${String.fromCharCode(65 + i)}. `;
                const rightLabel = `${i + 1}. `;

                doc.setFont(activeFont, 'bold');
                doc.setFontSize(subQFontSize);
                const leftLabelW = doc.getTextWidth(leftLabel);
                const rightLabelW = doc.getTextWidth(rightLabel);

                doc.text(leftLabel, colA_X, y);
                doc.text(rightLabel, colB_X, y);

                doc.setFont(activeFont, 'normal');
                const leftLines: string[] = doc.splitTextToSize(pair.left || '', singleColWidth - leftLabelW);
                const rightLines: string[] = doc.splitTextToSize(pair.right || '', singleColWidth - rightLabelW);

                doc.text(leftLines, colA_X + leftLabelW, y);
                doc.text(rightLines, colB_X + rightLabelW, y);

                const rowLines = Math.max(leftLines.length, rightLines.length, 1);
                y += rowLines * subQLineHeight + 1.2;
              }
            }

            maxPageY[currentPage] = Math.max(maxPageY[currentPage] || 0, y);
            y += QUESTION_GAP;
            continue;
          }

          // Handle PASSAGE questions
          if (segment.type === 'PASSAGE' || question.segmentType === 'PASSAGE') {
            const passageText = question.passageText || '';
            const subQuestions = question.subQuestions || [];
            
            const formattedPassage = parseHtmlToFormattedText(passageText);
            await resolveMathSegments(formattedPassage, fontColor, subQFontSize);
            const passageHeight = estimateSegmentsHeight(doc, formattedPassage, textAreaWidth, LINE_HEIGHT);
            
            const instructionHeight = LINE_HEIGHT * 1.5;
            let subQuestionsHeight = 0;
            for (const sq of subQuestions) {
              const formattedSQ = parseHtmlToFormattedText(sq.text || '');
              await resolveMathSegments(formattedSQ, fontColor, subQFontSize);
              subQuestionsHeight += estimateSegmentsHeight(doc, formattedSQ, textAreaWidth, subQLineHeight) + subQLineHeight;
            }
            
            const totalPassageHeight = passageHeight + instructionHeight + subQuestionsHeight + 20;
            
            await advanceCursor(totalPassageHeight);
            
            doc.setFont(activeFont, 'bold');
            doc.setFontSize(baseFontSize);
            doc.text(qPrefix, getX(), y);
            y += LINE_HEIGHT;
            
            const { newY: afterPassageY } = renderFormattedText(
              doc,
              formattedPassage,
              getX() + qPrefixWidth,
              y,
              textAreaWidth,
              LINE_HEIGHT,
              activeFont,
              rgb,
              subQFontSize
            );
            y = afterPassageY + LINE_HEIGHT;
            
            doc.setFont(activeFont, 'bold');
            doc.setFontSize(Math.max(subQFontSize - 0.5, 8.5));
            doc.text('Answer the following questions based on the above passage:', getX() + qPrefixWidth, y);
            y += LINE_HEIGHT * 1.5;
            
            for (let index = 0; index < subQuestions.length; index++) {
              const sq = subQuestions[index];
              if (!sq) continue;
              const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't'];
              const sqPrefix = `${letters[index]}) `;
              doc.setFont(activeFont, 'bold');
              doc.setFontSize(subQFontSize);
              const sqPrefixWidth = doc.getTextWidth(sqPrefix);
              const formattedSQ = parseHtmlToFormattedText(sq.text || '');
              await resolveMathSegments(formattedSQ, fontColor, subQFontSize);
              
              doc.text(sqPrefix, getX() + qPrefixWidth, y);
              
              const { newY: afterSQY } = renderFormattedText(
                doc,
                formattedSQ,
                getX() + qPrefixWidth + sqPrefixWidth,
                y,
                textAreaWidth - sqPrefixWidth,
                subQLineHeight,
                activeFont,
                rgb,
                subQFontSize
              );
              y = afterSQY + subQLineHeight;
            }
            
            y += QUESTION_GAP;
            continue;
          }

          // Handle ASSERTION_REASONING questions
          if (segment.type === 'ASSERTION_REASONING' || question.segmentType === 'ASSERTION_REASONING') {
            const assertion = question.assertion || '';
            const reason = question.reason || '';
            
            const formattedAssertion = parseHtmlToFormattedText(assertion);
            const formattedReason = parseHtmlToFormattedText(reason);
            await resolveMathSegments(formattedAssertion, fontColor, baseFontSize);
            await resolveMathSegments(formattedReason, fontColor, baseFontSize);
            
            const assertionHeight = estimateSegmentsHeight(doc, formattedAssertion, textAreaWidth, LINE_HEIGHT);
            const reasonHeight = estimateSegmentsHeight(doc, formattedReason, textAreaWidth, LINE_HEIGHT);
            const totalARHeight = assertionHeight + reasonHeight + LINE_HEIGHT * 3 + 10;
            
            await advanceCursor(totalARHeight);
            
            doc.setFont(activeFont, 'bold');
            doc.setFontSize(baseFontSize);
            doc.text(qPrefix, getX(), y);
            y += LINE_HEIGHT;
            
            doc.setFont(activeFont, 'bold');
            doc.setFontSize(baseFontSize);
            doc.text('Assertion (A):', getX() + qPrefixWidth, y);
            y += LINE_HEIGHT;
            
            const { newY: afterAssertionY } = renderFormattedText(
              doc,
              formattedAssertion,
              getX() + qPrefixWidth,
              y,
              textAreaWidth,
              LINE_HEIGHT,
              activeFont,
              rgb,
              baseFontSize
            );
            y = afterAssertionY + LINE_HEIGHT;
            
            doc.setFont(activeFont, 'bold');
            doc.setFontSize(baseFontSize);
            doc.text('Reason (R):', getX() + qPrefixWidth, y);
            y += LINE_HEIGHT;
            
            const { newY: afterReasonY } = renderFormattedText(
              doc,
              formattedReason,
              getX() + qPrefixWidth,
              y,
              textAreaWidth,
              LINE_HEIGHT,
              activeFont,
              rgb,
              baseFontSize
            );
            y = afterReasonY;
            
            y += QUESTION_GAP;
            continue;
          }

          let imgBase64: string | null = null;
          let scaledWidth = 0;
          let scaledHeight = 0;

          if (hasImage) {
            try {
              imgBase64 = await fetchImageAsBase64(question.imageUrl!);
              const imgProps = doc.getImageProperties(imgBase64);
              const naturalWidth = imgProps.width;
              const naturalHeight = imgProps.height;
              const scale = Math.min(maxBoxWidth / naturalWidth, maxBoxHeight / naturalHeight);
              scaledWidth = naturalWidth * scale;
              scaledHeight = naturalHeight * scale;
            } catch (e) {
              console.warn('Failed to load question image:', e);
            }
          }

          const formattedSegments = parseHtmlToFormattedText(question.questionText);
          await resolveMathSegments(formattedSegments, fontColor, baseFontSize);

          const totalHeight = estimateSegmentsHeight(doc, formattedSegments, textAreaWidth, LINE_HEIGHT);

          // Topic & Hint metadata
          const metaParts: string[] = [];
          if (question.subject?.trim()) metaParts.push(`Topic: ${question.subject.trim()}`);
          if (question.hint?.trim()) metaParts.push(`Hint: ${question.hint.trim()}`);

          let topicHeight = 0;
          const metaFontSize = Math.max(baseFontSize - 2.5, 7.5);
          const metaLineHeight = Math.max(metaFontSize * 0.3528 * 1.15, 3.0);
          let metaLines: string[] = [];
          if (metaParts.length > 0) {
            const metaText = metaParts.map(p => `[${p}]`).join('   ');
            doc.setFont(activeFont, 'italic');
            doc.setFontSize(metaFontSize);
            metaLines = doc.splitTextToSize(metaText, textAreaWidth);
            topicHeight = metaLines.length * metaLineHeight + 0.8;
          }

          const isMCQ = segment.type === 'MCQ' || question.segmentType === 'MCQ' || (!!question.options && question.options.length > 0);
          let optionsData: OptionRenderData[] = [];
          let totalOptionsHeight = 0;
          const availableLeftWidth = hasImage ? (colWidth - scaledWidth - IMAGE_RIGHT_MARGIN - IMAGE_TEXT_GAP) : colWidth;
          const useSingleColOptions = (hasImage && availableLeftWidth < 50) ||
            Boolean(question.options?.some((opt: any) => {
              const text = typeof opt === 'string' ? opt : (opt.text || '');
              return text.length > 90;
            }));
          const colGap = 6;
          const optColWidth = useSingleColOptions ? (availableLeftWidth - 2) : Math.floor((availableLeftWidth - colGap) / 2);

          if (isMCQ && question.options && question.options.length > 0) {
            optionsData = await buildOptionRenderData(doc, question.options, optColWidth, activeFont, optFontSize, optLineHeight, fontColor);
            if (useSingleColOptions) {
              totalOptionsHeight = optionsData.reduce((acc, o) => acc + o.height, 0);
            } else {
              totalOptionsHeight = 0;
              for (let i = 0; i < optionsData.length; i += 2) {
                const h1 = optionsData[i]?.height || 0;
                const h2 = optionsData[i + 1]?.height || 0;
                totalOptionsHeight += Math.max(h1, h2, optLineHeight);
              }
            }
          }

          const requiredHeight = Math.max(
            totalHeight + topicHeight + totalOptionsHeight,
            hasImage ? (scaledHeight - 3) : 0
          ) + QUESTION_GAP;

          await advanceCursor(requiredHeight);

          const questionStartY = y;

          doc.setFont(activeFont, 'bold');
          doc.setFontSize(baseFontSize);
          doc.text(qPrefix, getX(), y);

          const { newY: afterQuestionY } = renderFormattedText(
            doc,
            formattedSegments,
            getX() + qPrefixWidth,
            y,
            textAreaWidth,
            LINE_HEIGHT,
            activeFont,
            rgb,
            baseFontSize
          );

          // Render image on right side if present
          let imgBottomY = questionStartY;
          if (hasImage && imgBase64 && scaledWidth > 0 && scaledHeight > 0) {
            try {
              const imgX = getX() + colWidth - IMAGE_RIGHT_MARGIN - scaledWidth;
              doc.addImage(imgBase64, 'PNG', imgX, questionStartY - 3, scaledWidth, scaledHeight);
              imgBottomY = questionStartY - 3 + scaledHeight;
            } catch (e) {
              console.warn('Failed to render question image:', e);
            }
          }

          // Render Topic & Hint line cleanly below question text without gap
          let afterTopicY = afterQuestionY;
          if (metaParts.length > 0 && metaLines.length > 0) {
            doc.setFont(activeFont, 'italic');
            doc.setFontSize(metaFontSize);
            doc.setTextColor(100, 116, 139);
            const metaStartY = afterQuestionY - 0.5;
            metaLines.forEach((mLine: string, mIdx: number) => {
              doc.text(mLine, getX() + qPrefixWidth, metaStartY + (mIdx * metaLineHeight));
            });
            afterTopicY = metaStartY + (metaLines.length * metaLineHeight) + 0.3;
            doc.setTextColor(rgb.r, rgb.g, rgb.b);
          }

          let afterOptionsY = afterTopicY;
          if (isMCQ && optionsData.length > 0) {
            const startY = afterTopicY + 0.3;

            if (useSingleColOptions) {
              afterOptionsY = renderSingleColOptions(doc, optionsData, getX(), startY, optColWidth, optLineHeight, activeFont, rgb, optFontSize);
            } else {
              afterOptionsY = render2ColOptions(doc, optionsData, getX(), startY, optColWidth, colGap, optLineHeight, activeFont, rgb, optFontSize);
            }
          }

          y = Math.max(afterOptionsY, hasImage ? imgBottomY : afterOptionsY);

          y += QUESTION_GAP;

          // Render alternative questions (internal choice)
          const alternatives = question.alternatives || [];
          for (const alt of alternatives) {
            if (!alt.questionText) continue;

            const altHasImage = !!alt.imageUrl;
            let altImgBase64: string | null = null;
            let altScaledWidth = 0;
            let altScaledHeight = 0;

            if (altHasImage) {
              try {
                altImgBase64 = await fetchImageAsBase64(alt.imageUrl!);
                const imgProps = doc.getImageProperties(altImgBase64);
                const naturalWidth = imgProps.width;
                const naturalHeight = imgProps.height;
                const scale = Math.min(maxBoxWidth / naturalWidth, maxBoxHeight / naturalHeight);
                altScaledWidth = naturalWidth * scale;
                altScaledHeight = naturalHeight * scale;
              } catch (e) {
                console.warn('Failed to load alternative question image:', e);
              }
            }

            const altIsMCQ = segment.type === 'MCQ' || (alt as any).segmentType === 'MCQ' || (!!alt.options && alt.options.length > 0);

            // Render OR separator
            doc.setFont(activeFont, 'bold');
            doc.setFontSize(baseFontSize);
            doc.text('OR', getX(), y);
            y += LINE_HEIGHT;

            const altFormattedSegments = parseHtmlToFormattedText(alt.questionText);
            await resolveMathSegments(altFormattedSegments, fontColor, baseFontSize);

            const altTotalHeight = estimateSegmentsHeight(doc, altFormattedSegments, textAreaWidth, LINE_HEIGHT);

            // Alternative Topic & Hint metadata
            const altMetaParts: string[] = [];
            if (alt.subject?.trim()) altMetaParts.push(`Topic: ${alt.subject.trim()}`);
            if (alt.hint?.trim()) altMetaParts.push(`Hint: ${alt.hint.trim()}`);

            let altTopicHeight = 0;
            let altMetaLines: string[] = [];
            if (altMetaParts.length > 0) {
              const altMetaText = altMetaParts.map(p => `[${p}]`).join('   ');
              doc.setFont(activeFont, 'italic');
              doc.setFontSize(metaFontSize);
              altMetaLines = doc.splitTextToSize(altMetaText, textAreaWidth);
              altTopicHeight = altMetaLines.length * metaLineHeight + 0.8;
            }

            let altOptionsData: OptionRenderData[] = [];
            let altTotalOptionsHeight = 0;
            const altAvailableLeftWidth = altHasImage ? (colWidth - altScaledWidth - IMAGE_RIGHT_MARGIN - IMAGE_TEXT_GAP) : colWidth;
            const altUseSingleColOptions = (altHasImage && altAvailableLeftWidth < 50) ||
              Boolean(alt.options?.some((opt: any) => {
                const text = typeof opt === 'string' ? opt : (opt.text || '');
                return text.length > 90;
              }));
            const altColGap = 6;
            const altOptColWidth = altUseSingleColOptions ? (altAvailableLeftWidth - 2) : Math.floor((altAvailableLeftWidth - altColGap) / 2);

            if (altIsMCQ && alt.options && alt.options.length > 0) {
              altOptionsData = await buildOptionRenderData(doc, alt.options, altOptColWidth, activeFont, optFontSize, optLineHeight, fontColor);
              if (altUseSingleColOptions) {
                altTotalOptionsHeight = altOptionsData.reduce((acc, o) => acc + o.height, 0);
              } else {
                altTotalOptionsHeight = 0;
                for (let i = 0; i < altOptionsData.length; i += 2) {
                  const h1 = altOptionsData[i]?.height || 0;
                  const h2 = altOptionsData[i + 1]?.height || 0;
                  altTotalOptionsHeight += Math.max(h1, h2, optLineHeight);
                }
              }
            }

            const altRequiredHeight = Math.max(
              altTotalHeight + altTopicHeight + altTotalOptionsHeight,
              altHasImage ? (altScaledHeight - 3) : 0
            ) + QUESTION_GAP;

            await advanceCursor(altRequiredHeight);

            const altQuestionStartY = y;

            const { newY: afterAltQuestionY } = renderFormattedText(
              doc,
              altFormattedSegments,
              getX() + qPrefixWidth,
              y,
              textAreaWidth,
              LINE_HEIGHT,
              activeFont,
              rgb,
              baseFontSize
            );

            let altImgBottomY = altQuestionStartY;
            if (altHasImage && altImgBase64 && altScaledWidth > 0 && altScaledHeight > 0) {
              try {
                const imgX = getX() + colWidth - IMAGE_RIGHT_MARGIN - altScaledWidth;
                doc.addImage(altImgBase64, 'PNG', imgX, altQuestionStartY - 3, altScaledWidth, altScaledHeight);
                altImgBottomY = altQuestionStartY - 3 + altScaledHeight;
              } catch (e) {
                console.warn('Failed to render alternative question image:', e);
              }
            }

            // Render Alt Topic & Hint
            let afterAltTopicY = afterAltQuestionY;
            if (altMetaParts.length > 0 && altMetaLines.length > 0) {
              doc.setFont(activeFont, 'italic');
              doc.setFontSize(metaFontSize);
              doc.setTextColor(100, 116, 139);
              const altMetaStartY = afterAltQuestionY - 0.5;
              altMetaLines.forEach((mLine: string, mIdx: number) => {
                doc.text(mLine, getX() + qPrefixWidth, altMetaStartY + (mIdx * metaLineHeight));
              });
              afterAltTopicY = altMetaStartY + (altMetaLines.length * metaLineHeight) + 0.3;
              doc.setTextColor(rgb.r, rgb.g, rgb.b);
            }

            let afterAltOptionsY = afterAltTopicY;
            if (altIsMCQ && altOptionsData.length > 0) {
              const startY = afterAltTopicY + 0.3;

              if (altUseSingleColOptions) {
                afterAltOptionsY = renderSingleColOptions(doc, altOptionsData, getX(), startY, altOptColWidth, optLineHeight, activeFont, rgb, optFontSize);
              } else {
                afterAltOptionsY = render2ColOptions(doc, altOptionsData, getX(), startY, altOptColWidth, altColGap, optLineHeight, activeFont, rgb, optFontSize);
              }
            }

            y = Math.max(afterAltOptionsY, altHasImage ? altImgBottomY : afterAltOptionsY);

            y += QUESTION_GAP;
          } 
        }
      }
    } else {
      for (let qIndex = 0; qIndex < section.questions.length; qIndex++) {
        const question = section.questions[qIndex];
        if (!question) continue;

        const qPrefix = `Q${qIndex + 1}. `;

        doc.setFont(activeFont, 'bold');
        doc.setFontSize(baseFontSize);
        const qPrefixWidth = doc.getTextWidth(qPrefix);

        const hasImage = !!question.imageUrl;
        const maxBoxWidth = paper.templateType === 'SPLIT' ? 35 : 45;
        const maxBoxHeight = paper.templateType === 'SPLIT' ? 30 : 35;

        const textAreaWidth = colWidth - qPrefixWidth - (hasImage ? (maxBoxWidth + IMAGE_TEXT_GAP + IMAGE_RIGHT_MARGIN) : 0);

        let imgBase64: string | null = null;
        let scaledWidth = 0;
        let scaledHeight = 0;

        if (hasImage) {
          try {
            imgBase64 = await fetchImageAsBase64(question.imageUrl!);
            const imgProps = doc.getImageProperties(imgBase64);
            const naturalWidth = imgProps.width;
            const naturalHeight = imgProps.height;
            const scale = Math.min(maxBoxWidth / naturalWidth, maxBoxHeight / naturalHeight);
            scaledWidth = naturalWidth * scale;
            scaledHeight = naturalHeight * scale;
          } catch (e) {
            console.warn('Failed to load question image:', e);
          }
        }

        const formattedSegments = parseHtmlToFormattedText(question.questionText);
        await resolveMathSegments(formattedSegments, fontColor, baseFontSize);

        const totalHeight = estimateSegmentsHeight(doc, formattedSegments, textAreaWidth, LINE_HEIGHT);

        // Topic & Hint metadata
        const metaParts: string[] = [];
        if (question.subject?.trim()) metaParts.push(`Topic: ${question.subject.trim()}`);
        if (question.hint?.trim()) metaParts.push(`Hint: ${question.hint.trim()}`);

        let topicHeight = 0;
        const metaFontSize = Math.max(baseFontSize - 2.5, 7.5);
        const metaLineHeight = Math.max(metaFontSize * 0.3528 * 1.15, 3.0);
        let metaLines: string[] = [];
        if (metaParts.length > 0) {
          const metaText = metaParts.map(p => `[${p}]`).join('   ');
          doc.setFont(activeFont, 'italic');
          doc.setFontSize(metaFontSize);
          metaLines = doc.splitTextToSize(metaText, textAreaWidth);
          topicHeight = metaLines.length * metaLineHeight + 0.8;
        }

        const isMCQ = (question as any).type === 'MCQ' || question.segmentType === 'MCQ' || (!!question.options && question.options.length > 0);
        let optionsData: OptionRenderData[] = [];
        let totalOptionsHeight = 0;
        const availableLeftWidth = hasImage ? (colWidth - scaledWidth - IMAGE_RIGHT_MARGIN - IMAGE_TEXT_GAP) : colWidth;
        const useSingleColOptions = (hasImage && availableLeftWidth < 50) ||
          Boolean(question.options?.some((opt: any) => {
            const text = typeof opt === 'string' ? opt : (opt.text || '');
            return text.length > 90;
          }));
        const colGap = 6;
        const optColWidth = useSingleColOptions ? (availableLeftWidth - 2) : Math.floor((availableLeftWidth - colGap) / 2);

        if (isMCQ && question.options && question.options.length > 0) {
          optionsData = await buildOptionRenderData(doc, question.options, optColWidth, activeFont, optFontSize, optLineHeight, fontColor);
          if (useSingleColOptions) {
            totalOptionsHeight = optionsData.reduce((acc, o) => acc + o.height, 0);
          } else {
            totalOptionsHeight = 0;
            for (let i = 0; i < optionsData.length; i += 2) {
              const h1 = optionsData[i]?.height || 0;
              const h2 = optionsData[i + 1]?.height || 0;
              totalOptionsHeight += Math.max(h1, h2, optLineHeight);
            }
          }
        }

        const requiredHeight = Math.max(
          totalHeight + topicHeight + totalOptionsHeight,
          hasImage ? (scaledHeight - 3) : 0
        ) + QUESTION_GAP;

        await advanceCursor(requiredHeight);

        const questionStartY = y;

        doc.setFont(activeFont, 'bold');
        doc.setFontSize(baseFontSize);
        doc.text(qPrefix, getX(), y);

        const { newY: afterQuestionY } = renderFormattedText(
          doc,
          formattedSegments,
          getX() + qPrefixWidth,
          y,
          textAreaWidth,
          LINE_HEIGHT,
          activeFont,
          rgb,
          baseFontSize
        );

        // Render image on right side if present
        let imgBottomY = questionStartY;
        if (hasImage && imgBase64 && scaledWidth > 0 && scaledHeight > 0) {
          try {
            const imgX = getX() + colWidth - IMAGE_RIGHT_MARGIN - scaledWidth;
            doc.addImage(imgBase64, 'PNG', imgX, questionStartY - 3, scaledWidth, scaledHeight);
            imgBottomY = questionStartY - 3 + scaledHeight;
          } catch (e) {
            console.warn('Failed to render question image:', e);
          }
        }

        // Render Topic & Hint line cleanly below question text without gap
        let afterTopicY = afterQuestionY;
        if (metaParts.length > 0 && metaLines.length > 0) {
          doc.setFont(activeFont, 'italic');
          doc.setFontSize(metaFontSize);
          doc.setTextColor(100, 116, 139);
          const metaStartY = afterQuestionY - 0.5;
          metaLines.forEach((mLine: string, mIdx: number) => {
            doc.text(mLine, getX() + qPrefixWidth, metaStartY + (mIdx * metaLineHeight));
          });
          afterTopicY = metaStartY + (metaLines.length * metaLineHeight) + 0.3;
          doc.setTextColor(rgb.r, rgb.g, rgb.b);
        }

        let afterOptionsY = afterTopicY;
        if (isMCQ && optionsData.length > 0) {
          const startY = afterTopicY + 0.3;

          if (useSingleColOptions) {
            afterOptionsY = renderSingleColOptions(doc, optionsData, getX(), startY, optColWidth, optLineHeight, activeFont, rgb, optFontSize);
          } else {
            afterOptionsY = render2ColOptions(doc, optionsData, getX(), startY, optColWidth, colGap, optLineHeight, activeFont, rgb, optFontSize);
          }
        }

        y = Math.max(afterOptionsY, hasImage ? imgBottomY : afterOptionsY);

        y += QUESTION_GAP;

        // Render alternative questions (internal choice)
        const alternatives = question.alternatives || [];
        for (const alt of alternatives) {
          if (!alt.questionText) continue;

          const altHasImage = !!alt.imageUrl;
          let altImgBase64: string | null = null;
          let altScaledWidth = 0;
          let altScaledHeight = 0;

          if (altHasImage) {
            try {
              altImgBase64 = await fetchImageAsBase64(alt.imageUrl!);
              const imgProps = doc.getImageProperties(altImgBase64);
              const naturalWidth = imgProps.width;
              const naturalHeight = imgProps.height;
              const scale = Math.min(maxBoxWidth / naturalWidth, maxBoxHeight / naturalHeight);
              altScaledWidth = naturalWidth * scale;
              altScaledHeight = naturalHeight * scale;
            } catch (e) {
              console.warn('Failed to load alternative question image:', e);
            }
          }

          const altIsMCQ = (alt as any).type === 'MCQ' || (alt as any).segmentType === 'MCQ' || (!!alt.options && alt.options.length > 0);

          // Render OR separator
          doc.setFont(activeFont, 'bold');
          doc.setFontSize(baseFontSize);
          doc.text('OR', getX(), y);
          y += LINE_HEIGHT;

          const altFormattedSegments = parseHtmlToFormattedText(alt.questionText);
          await resolveMathSegments(altFormattedSegments, fontColor, baseFontSize);

          const altTotalHeight = estimateSegmentsHeight(doc, altFormattedSegments, textAreaWidth, LINE_HEIGHT);

          // Alternative Topic & Hint metadata
          const altMetaParts: string[] = [];
          if (alt.subject?.trim()) altMetaParts.push(`Topic: ${alt.subject.trim()}`);
          if (alt.hint?.trim()) altMetaParts.push(`Hint: ${alt.hint.trim()}`);

          let altTopicHeight = 0;
          let altMetaLines: string[] = [];
          if (altMetaParts.length > 0) {
            const altMetaText = altMetaParts.map(p => `[${p}]`).join('   ');
            doc.setFont(activeFont, 'italic');
            doc.setFontSize(metaFontSize);
            altMetaLines = doc.splitTextToSize(altMetaText, textAreaWidth);
            altTopicHeight = altMetaLines.length * metaLineHeight + 0.8;
          }

          let altOptionsData: OptionRenderData[] = [];
          let altTotalOptionsHeight = 0;
          const altAvailableLeftWidth = altHasImage ? (colWidth - altScaledWidth - IMAGE_RIGHT_MARGIN - IMAGE_TEXT_GAP) : colWidth;
          const altUseSingleColOptions = (altHasImage && altAvailableLeftWidth < 50) ||
            Boolean(alt.options?.some((opt: any) => {
              const text = typeof opt === 'string' ? opt : (opt.text || '');
              return text.length > 90;
            }));
          const altColGap = 6;
          const altOptColWidth = altUseSingleColOptions ? (altAvailableLeftWidth - 2) : Math.floor((altAvailableLeftWidth - altColGap) / 2);

          if (altIsMCQ && alt.options && alt.options.length > 0) {
            altOptionsData = await buildOptionRenderData(doc, alt.options, altOptColWidth, activeFont, optFontSize, optLineHeight, fontColor);
            if (altUseSingleColOptions) {
              altTotalOptionsHeight = altOptionsData.reduce((acc, o) => acc + o.height, 0);
            } else {
              altTotalOptionsHeight = 0;
              for (let i = 0; i < altOptionsData.length; i += 2) {
                const h1 = altOptionsData[i]?.height || 0;
                const h2 = altOptionsData[i + 1]?.height || 0;
                altTotalOptionsHeight += Math.max(h1, h2, optLineHeight);
              }
            }
          }

          const altRequiredHeight = Math.max(
            altTotalHeight + altTopicHeight + altTotalOptionsHeight,
            altHasImage ? (altScaledHeight - 3) : 0
          ) + QUESTION_GAP;

          await advanceCursor(altRequiredHeight);

          const altQuestionStartY = y;

          const { newY: afterAltQuestionY } = renderFormattedText(
            doc,
            altFormattedSegments,
            getX() + qPrefixWidth,
            y,
            textAreaWidth,
            LINE_HEIGHT,
            activeFont,
            rgb,
            baseFontSize
          );

          let altImgBottomY = altQuestionStartY;
          if (altHasImage && altImgBase64 && altScaledWidth > 0 && altScaledHeight > 0) {
            try {
              const imgX = getX() + colWidth - IMAGE_RIGHT_MARGIN - altScaledWidth;
              doc.addImage(altImgBase64, 'PNG', imgX, altQuestionStartY - 3, altScaledWidth, altScaledHeight);
              altImgBottomY = altQuestionStartY - 3 + altScaledHeight;
            } catch (e) {
              console.warn('Failed to render alternative question image:', e);
            }
          }

          // Render Alt Topic & Hint
          let afterAltTopicY = afterAltQuestionY;
          if (altMetaParts.length > 0 && altMetaLines.length > 0) {
            doc.setFont(activeFont, 'italic');
            doc.setFontSize(metaFontSize);
            doc.setTextColor(100, 116, 139);
            const altMetaStartY = afterAltQuestionY - 0.5;
            altMetaLines.forEach((mLine: string, mIdx: number) => {
              doc.text(mLine, getX() + qPrefixWidth, altMetaStartY + (mIdx * metaLineHeight));
            });
            afterAltTopicY = altMetaStartY + (altMetaLines.length * metaLineHeight) + 0.3;
            doc.setTextColor(rgb.r, rgb.g, rgb.b);
          }

          let afterAltOptionsY = afterAltTopicY;
          if (altIsMCQ && altOptionsData.length > 0) {
            const startY = afterAltTopicY + 0.3;

            if (altUseSingleColOptions) {
              afterAltOptionsY = renderSingleColOptions(doc, altOptionsData, getX(), startY, altOptColWidth, optLineHeight, activeFont, rgb, optFontSize);
            } else {
              afterAltOptionsY = render2ColOptions(doc, altOptionsData, getX(), startY, altOptColWidth, altColGap, optLineHeight, activeFont, rgb, optFontSize);
            }
          }

          y = Math.max(afterAltOptionsY, altHasImage ? altImgBottomY : afterAltOptionsY);

          y += QUESTION_GAP;
        } 
      }
    }
    y += SECTION_GAP;
    maxPageY[currentPage] = Math.max(maxPageY[currentPage] || 0, y);
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    drawMiddleSplitLineForPage(i);
  }

  return doc.output('blob');
}

export async function generateBulkExamPapersZip(
  paper: PdfPaperData,
  studentCount: number
): Promise<Blob> {
  const zip = new JSZip();

  for (let i = 1; i <= studentCount; i++) {
    const rollNo = `ROLL-${String(i).padStart(3, '0')}`;
    const pdfBlob = await generateExamPaperPdf(paper, rollNo);
    zip.file(`exam_paper_${rollNo}.pdf`, pdfBlob);
  }

  return zip.generateAsync({ type: 'blob' });
}