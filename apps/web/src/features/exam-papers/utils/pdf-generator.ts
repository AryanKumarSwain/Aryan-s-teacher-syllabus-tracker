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
const SEGMENT_HEADER_GAP = 7;   // gap after a segment header line before Q1
const SECTION_LABEL_GAP = 7;    // gap after section label before Q1

const IMAGE_TEXT_GAP = 4;        // 4mm margin between text and image box
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
  lines: string[];
}

function convertLatexToFallbackUnicode(latex: string): string {
  let text = latex;
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

  const cacheKey = `${trimmed}_${color}_${fontSizePt}`;
  if (mathImageCache.has(cacheKey)) {
    return mathImageCache.get(cacheKey)!;
  }

  let container: HTMLDivElement | null = null;
  try {
    container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-10000px';
    container.style.top = '0';
    container.style.width = 'auto';
    container.style.height = 'auto';
    container.style.visibility = 'visible';
    container.style.pointerEvents = 'none';

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
    // Generous padding — prevents radical vinculum and fraction bars from being clipped
    // at the top/bottom edges of the canvas
    mathSpan.style.padding = '8px 6px';
    mathSpan.style.color = color;
    mathSpan.style.backgroundColor = 'transparent';
    mathSpan.style.fontSize = '24px';
    mathSpan.style.lineHeight = '1.4';

    katex.render(trimmed, mathSpan, {
      throwOnError: false,
      displayMode: false,
    });

    flexWrap.appendChild(zeroAnchor);
    flexWrap.appendChild(mathSpan);
    container.appendChild(flexWrap);
    document.body.appendChild(container);

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

    // Distance from top of mathSpan to typographic baseline
    const baselinePx = anchorRect.bottom - rect.top;
    // Add the top padding (8px) offset since canvas includes it
    const baselinePxWithPadding = baselinePx + 8;
    const baselineRatio = Math.max(0.20, Math.min(0.85, baselinePxWithPadding / (pixelHeight || 1)));

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
      if (currentLineWidth + seg.mathWidth > width && currentLineWidth > 0) {
        wrapLine();
      }
      currentLineWidth += seg.mathWidth + spaceWidth * 0.3;
      if (seg.mathHeight && seg.mathHeight > currentLineHeight) {
        // Add generous buffer (4mm) to account for tall radicals/fractions and padding
        currentLineHeight = Math.max(currentLineHeight, seg.mathHeight + 4.0);
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
      const mWidth = segment.mathWidth;
      const mHeight = segment.mathHeight;
      const bRatio = segment.baselineRatio ?? 0.55;

      if (currentX > x && currentX + mWidth > rightEdge) {
        currentY += Math.max(lineHeight, maxDescender + (lineHeight * 0.6));
        currentX = x;
        maxDescender = Math.max(lineHeight * 0.25, 1.0);
      }

      // Draw image so that the baseline of the math aligns with the text baseline (currentY).
      // yDraw = top of image = currentY - (portion above baseline)
      // We clamp so image top is never above current Y minus line height (prevents page-edge clipping)
      const aboveBaseline = mHeight * bRatio;
      const yDraw = Math.max(currentY - aboveBaseline, currentY - Math.max(lineHeight * 1.5, mHeight));
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
      // Also track if the image top goes above current line — need extra space above
      const imageTop = yDraw;
      const spaceAboveBaseline = currentY - imageTop;
      if (spaceAboveBaseline > lineHeight) {
        // The image is taller than normal line height — update maxDescender to account for full height
        maxDescender = Math.max(maxDescender, mHeight - lineHeight * 0.5);
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
    // Leave safe clearance below the deepest formula descender on this line
    currentY += Math.max(lineHeight, maxDescender + 2.5);
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

function buildOptionRenderData(
  doc: typeof jsPDF.prototype,
  options: Array<{ text: string; isCorrect?: boolean } | string>,
  availableWidth: number,
  activeFont: string,
  fontSize: number
): OptionRenderData[] {
  doc.setFont(activeFont, 'normal');
  doc.setFontSize(fontSize);
  return options.map((opt, oIndex) => {
    const optPrefix = `${String.fromCharCode(97 + oIndex)}) `;
    const rawText = typeof opt === 'string' ? opt : (opt.text || '');
    const optText = convertLatexToFallbackUnicode(rawText);
    const prefixWidth = doc.getTextWidth(optPrefix);
    const lines = doc.splitTextToSize(optText, Math.max(availableWidth - prefixWidth, 10));
    return { prefix: optPrefix, prefixWidth, lines };
  });
}

function renderOptionColumn(
  doc: typeof jsPDF.prototype,
  options: OptionRenderData[],
  x: number,
  startY: number,
  lineHeight: number,
  activeFont: string,
  fontSize: number
): number {
  doc.setFont(activeFont, 'normal');
  doc.setFontSize(fontSize);
  let currentY = startY;
  options.forEach((opt) => {
    opt.lines.forEach((line, lineIdx) => {
      if (lineIdx === 0) {
        doc.text(opt.prefix + line, x, currentY);
      } else {
        doc.text(line, x + opt.prefixWidth, currentY);
      }
      currentY += lineHeight;
    });
    currentY += 1.0;
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
        pDoc.setGState(new pDoc.GState({ opacity: 0.06 }));
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
    const teacherNameStr = paper.teacherName ? `Teacher: ${paper.teacherName}` : '';
    const infoParts = [`Class: ${paper.className || 'N/A'}`, `Subject: ${paper.subjectName || 'N/A'}`];
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
  let bottomMargin = 20;
  let currentColumn = 0; 
  let y = 72;

  const advanceCursor = async (requiredHeight: number) => {
    if (y + requiredHeight > 297 - bottomMargin) {
      if (paper.templateType === 'SPLIT' && currentColumn === 0) {
        currentColumn = 1;
        y = pageContentStartY[currentPage] ?? 16; 
      } else {
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
        y = 16; 
        pageContentStartY[currentPage] = 16;
      }
    }
  };

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
    const instHeight = estimateSegmentsHeight(doc, formattedInstructions, colWidth, LINE_HEIGHT);

    await advanceCursor(5 + instHeight);

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(Math.max(baseFontSize - 0.5, 9.5));
    doc.text('General Instructions:', getX(), y);
    y += 5;

    doc.setFont(activeFont, 'normal');
    doc.setFontSize(Math.max(baseFontSize - 1, 9));

    const { newY: afterInstructionsY } = renderFormattedText(
      doc,
      formattedInstructions,
      getX(),
      y,
      colWidth,
      LINE_HEIGHT,
      activeFont,
      rgb,
      Math.max(baseFontSize - 1, 9)
    );
    y = afterInstructionsY;
    y += 3;
  }

  const drawMiddleSplitLineForPage = (pageNum: number) => {
    if (paper.templateType !== 'SPLIT') return;
    const startY = pageContentStartY[pageNum] ?? 16;
    doc.setPage(pageNum);
    doc.setLineWidth(0.2);
    doc.setDrawColor(200, 200, 200);
    doc.line(105, startY, 105, CONTENT_END_Y);
    doc.setDrawColor(rgb.r, rgb.g, rgb.b); 
  };

  for (let sIndex = 0; sIndex < paper.sections.length; sIndex++) {
    const section = paper.sections[sIndex];
    if (!section) continue;

    await advanceCursor(12);

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(Math.max(baseFontSize + 1, 10.5));
    doc.text(section.label, getCenterX(), y, { align: 'center' });
    y += (section.segments && section.segments.length > 0) ? 5 : SECTION_LABEL_GAP;

    if (section.segments && section.segments.length > 0) {
      for (const segment of section.segments) {
        // Find questions belonging to this segment
        const segmentQuestions = section.questions.filter((q: any) => q.segmentType === segment.type);

        // SKIP EMPTY SEGMENTS (Fixes overlapping segment headers)
        if (segmentQuestions.length === 0) continue;

        await advanceCursor(8);
        doc.setFont(activeFont, 'bold');
        doc.setFontSize(Math.max(baseFontSize - 0.5, 9));
        const segmentLabel = `${segment.label} (${segment.questionCount} questions × ${segment.marksEach} marks = ${segment.questionCount * segment.marksEach} marks)`;
        doc.text(segmentLabel, getX() + 5, y);
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
            doc.text(line, getX() + 5, y);
            y += LINE_HEIGHT;
          });
          y += LINE_HEIGHT * 0.5;

          doc.setFont(activeFont, 'normal');
          doc.setFontSize(Math.max(baseFontSize - 2, 8));
          optionLinesArr.forEach((lines: string[]) => {
            lines.forEach((line: string) => {
              doc.text(line, getX() + 5, y);
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
            const matchingPairs = question.matchingPairs || [];
            const pairCount = matchingPairs.length;
            
            const pairHeight = subQLineHeight * 1.2;
            const totalMatchingHeight = pairCount * pairHeight + 10;
            
            await advanceCursor(totalMatchingHeight);
            
            doc.setFont(activeFont, 'bold');
            doc.setFontSize(baseFontSize);
            doc.text(qPrefix, getX(), y);
            y += LINE_HEIGHT;
            
            doc.setFont(activeFont, 'bold');
            doc.setFontSize(subQFontSize);
            const headerY = y;
            doc.text('Column A', getX() + qPrefixWidth + 5, headerY);
            doc.text('Column B', getX() + qPrefixWidth + colWidth / 2 + 5, headerY);
            y += LINE_HEIGHT * 1.5;
            
            doc.setFont(activeFont, 'normal');
            doc.setFontSize(subQFontSize);
            
            for (let i = 0; i < pairCount; i++) {
              const pair = matchingPairs[i];
              if (!pair) continue;
              const leftLabel = `${String.fromCharCode(65 + i)}.`;
              const rightLabel = `${i + 1}.`;
              
              doc.text(`${leftLabel} ${pair.left || ''}`, getX() + qPrefixWidth + 5, y);
              doc.text(`${rightLabel} ${pair.right || ''}`, getX() + qPrefixWidth + colWidth / 2 + 5, y);
              
              y += pairHeight;
            }
            
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

          const formattedSegments = parseHtmlToFormattedText(question.questionText)
            .concat(buildSuffixSegments(question));
          await resolveMathSegments(formattedSegments, fontColor, baseFontSize);

          const totalHeight = estimateSegmentsHeight(doc, formattedSegments, textAreaWidth, LINE_HEIGHT);

          let optionsData: OptionRenderData[] = [];
          let totalOptionsHeight = 0;
          const isMCQ = segment.type === 'MCQ' || question.segmentType === 'MCQ';

          if (isMCQ && question.options && question.options.length > 0) {
            optionsData = buildOptionRenderData(doc, question.options, colWidth / 2 - 5, activeFont, optFontSize);
            const leftLines = (optionsData[0]?.lines.length || 0) + (optionsData[1]?.lines.length || 0);
            const rightLines = (optionsData[2]?.lines.length || 0) + (optionsData[3]?.lines.length || 0);
            totalOptionsHeight = Math.max(leftLines, rightLines) * optLineHeight + 4;
          }

          const textAndImageHeight = Math.max(totalHeight, (hasImage && scaledHeight > 0) ? scaledHeight - 3 : 0);
          const requiredHeight = textAndImageHeight + totalOptionsHeight + QUESTION_GAP;

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
          y = afterQuestionY;

          // Render image on right side if present
          if (hasImage && imgBase64 && scaledWidth > 0 && scaledHeight > 0) {
            try {
              const imgX = getX() + colWidth - IMAGE_RIGHT_MARGIN - scaledWidth;
              doc.addImage(imgBase64, 'PNG', imgX, questionStartY - 3, scaledWidth, scaledHeight);
              y = Math.max(y, questionStartY - 3 + scaledHeight);
            } catch (e) {
              console.warn('Failed to render question image:', e);
            }
          }

          if (isMCQ && optionsData.length > 0) {
            const halfColWidth = colWidth / 2;
            const startY = y + 2.5;

            const leftY = renderOptionColumn(doc, optionsData.slice(0, 2), getX(), startY, optLineHeight, activeFont, optFontSize);
            const rightY = renderOptionColumn(doc, optionsData.slice(2, 4), getX() + halfColWidth, startY, optLineHeight, activeFont, optFontSize);

            y = Math.max(leftY, rightY);
          }

          y += QUESTION_GAP;

          // Render alternative questions (internal choice)
          const alternatives = question.alternatives || [];
          for (const alt of alternatives) {
            if (!alt.questionText) continue;

            // Render OR separator
            doc.setFont(activeFont, 'bold');
            doc.setFontSize(baseFontSize);
            doc.text('OR', getX(), y);
            y += LINE_HEIGHT;

            const altFormattedSegments = parseHtmlToFormattedText(alt.questionText);
            await resolveMathSegments(altFormattedSegments, fontColor, baseFontSize);

            const altTotalHeight = estimateSegmentsHeight(doc, altFormattedSegments, textAreaWidth, LINE_HEIGHT);

            let altOptionsData: OptionRenderData[] = [];
            let altTotalOptionsHeight = 0;
            const altIsMCQ = segment.type === 'MCQ' || question.segmentType === 'MCQ';

            if (altIsMCQ && alt.options && alt.options.length > 0) {
              altOptionsData = buildOptionRenderData(doc, alt.options, colWidth / 2 - 5, activeFont, optFontSize);
              const altLeftLines = (altOptionsData[0]?.lines.length || 0) + (altOptionsData[1]?.lines.length || 0);
              const altRightLines = (altOptionsData[2]?.lines.length || 0) + (altOptionsData[3]?.lines.length || 0);
              altTotalOptionsHeight = Math.max(altLeftLines, altRightLines) * optLineHeight + 4;
            }

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

            const altTextAndImageHeight = Math.max(altTotalHeight, (altHasImage && altScaledHeight > 0) ? altScaledHeight - 3 : 0);
            const altRequiredHeight = altTextAndImageHeight + altTotalOptionsHeight + QUESTION_GAP;

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
            y = afterAltQuestionY;

            if (altHasImage && altImgBase64 && altScaledWidth > 0 && altScaledHeight > 0) {
              try {
                const imgX = getX() + colWidth - IMAGE_RIGHT_MARGIN - altScaledWidth;
                doc.addImage(altImgBase64, 'PNG', imgX, altQuestionStartY - 3, altScaledWidth, altScaledHeight);
                y = Math.max(y, altQuestionStartY - 3 + altScaledHeight);
              } catch (e) {
                console.warn('Failed to render alternative question image:', e);
              }
            }

            if (altIsMCQ && altOptionsData.length > 0) {
              const halfColWidth = colWidth / 2;
              const startY = y + 2.5;

              const leftY = renderOptionColumn(doc, altOptionsData.slice(0, 2), getX(), startY, optLineHeight, activeFont, optFontSize);
              const rightY = renderOptionColumn(doc, altOptionsData.slice(2, 4), getX() + halfColWidth, startY, optLineHeight, activeFont, optFontSize);

              y = Math.max(leftY, rightY);
            }

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

        const formattedSegments = parseHtmlToFormattedText(question.questionText)
          .concat(buildSuffixSegments(question));
        await resolveMathSegments(formattedSegments, fontColor, baseFontSize);

        const totalHeight = estimateSegmentsHeight(doc, formattedSegments, textAreaWidth, LINE_HEIGHT);

        let optionsData: OptionRenderData[] = [];
        let totalOptionsHeight = 0;
        const isMCQ = section.type === 'MCQ' || question.segmentType === 'MCQ';

        if (isMCQ && question.options && question.options.length > 0) {
          optionsData = buildOptionRenderData(doc, question.options, colWidth / 2 - 5, activeFont, optFontSize);
          const leftLines = (optionsData[0]?.lines.length || 0) + (optionsData[1]?.lines.length || 0);
          const rightLines = (optionsData[2]?.lines.length || 0) + (optionsData[3]?.lines.length || 0);
          totalOptionsHeight = Math.max(leftLines, rightLines) * optLineHeight + 4;
        }

        const textAndImageHeight = Math.max(totalHeight, (hasImage && scaledHeight > 0) ? scaledHeight - 3 : 0);
        const requiredHeight = textAndImageHeight + totalOptionsHeight + QUESTION_GAP;

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
        y = afterQuestionY;

        // Render image on right side if present
        if (hasImage && imgBase64 && scaledWidth > 0 && scaledHeight > 0) {
          try {
            const imgX = getX() + colWidth - IMAGE_RIGHT_MARGIN - scaledWidth;
            doc.addImage(imgBase64, 'PNG', imgX, questionStartY - 3, scaledWidth, scaledHeight);
            y = Math.max(y, questionStartY - 3 + scaledHeight);
          } catch (e) {
            console.warn('Failed to render question image:', e);
          }
        }

        if (isMCQ && optionsData.length > 0) {
          const halfColWidth = colWidth / 2;
          const startY = y + 1.0;

          const leftY = renderOptionColumn(doc, optionsData.slice(0, 2), getX(), startY, optLineHeight, activeFont, optFontSize);
          const rightY = renderOptionColumn(doc, optionsData.slice(2, 4), getX() + halfColWidth, startY, optLineHeight, activeFont, optFontSize);

          y = Math.max(leftY, rightY);
        }

        y += QUESTION_GAP;

        // Render alternative questions (internal choice)
        const alternatives = question.alternatives || [];
        for (const alt of alternatives) {
          if (!alt.questionText) continue;

          // Render OR separator
          doc.setFont(activeFont, 'bold');
          doc.setFontSize(baseFontSize);
          doc.text('OR', getX(), y);
          y += LINE_HEIGHT;

          const altFormattedSegments = parseHtmlToFormattedText(alt.questionText);
          await resolveMathSegments(altFormattedSegments, fontColor, baseFontSize);

          const altTotalHeight = estimateSegmentsHeight(doc, altFormattedSegments, textAreaWidth, LINE_HEIGHT);

          let altOptionsData: OptionRenderData[] = [];
          let altTotalOptionsHeight = 0;
          const altIsMCQ = section.type === 'MCQ' || question.segmentType === 'MCQ';

          if (altIsMCQ && alt.options && alt.options.length > 0) {
            altOptionsData = buildOptionRenderData(doc, alt.options, colWidth / 2 - 5, activeFont, optFontSize);
            const altLeftLines = (altOptionsData[0]?.lines.length || 0) + (altOptionsData[1]?.lines.length || 0);
            const altRightLines = (altOptionsData[2]?.lines.length || 0) + (altOptionsData[3]?.lines.length || 0);
            altTotalOptionsHeight = Math.max(altLeftLines, altRightLines) * optLineHeight + 4;
          }

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

          const altTextAndImageHeight = Math.max(altTotalHeight, (altHasImage && altScaledHeight > 0) ? altScaledHeight - 3 : 0);
          const altRequiredHeight = altTextAndImageHeight + altTotalOptionsHeight + QUESTION_GAP;

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
          y = afterAltQuestionY;

          if (altHasImage && altImgBase64 && altScaledWidth > 0 && altScaledHeight > 0) {
            try {
              const imgX = getX() + colWidth - IMAGE_RIGHT_MARGIN - altScaledWidth;
              doc.addImage(altImgBase64, 'PNG', imgX, altQuestionStartY - 3, altScaledWidth, altScaledHeight);
              y = Math.max(y, altQuestionStartY - 3 + altScaledHeight);
            } catch (e) {
              console.warn('Failed to render alternative question image:', e);
            }
          }

          if (altIsMCQ && altOptionsData.length > 0) {
            const halfColWidth = colWidth / 2;
            const startY = y + 1.0;

            const leftY = renderOptionColumn(doc, altOptionsData.slice(0, 2), getX(), startY, optLineHeight, activeFont, optFontSize);
            const rightY = renderOptionColumn(doc, altOptionsData.slice(2, 4), getX() + halfColWidth, startY, optLineHeight, activeFont, optFontSize);

            y = Math.max(leftY, rightY);
          }

          y += QUESTION_GAP;
        } 
      }
    }
    y += SECTION_GAP;
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