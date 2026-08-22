import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

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
}

interface OptionRenderData {
  prefix: string;
  prefixWidth: number;
  lines: string[];
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
  
  const tagRegex = /<\/?([a-z]+)(?:\s[^>]*)?>/gi;
  let lastIndex = 0;
  let match;
  
  while ((match = tagRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const plainText = text.substring(lastIndex, match.index);
      if (plainText.trim()) {
        segments.push({
          text: plainText,
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
      const classMatch = match[0].match(/class="([^"]+)"/);
      if (classMatch && classMatch[1]?.includes('math-node')) {
        const dataMatch = match[0].match(/data-latex="([^"]+)"/);
        if (dataMatch) {
          const latex = dataMatch[1] ?? '';
          let convertedText = latex;
          
          // Convert basic LaTeX to Unicode
          convertedText = convertedText.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');
          convertedText = convertedText.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');
          convertedText = convertedText.replace(/\^\{([^}]+)\}/g, '^($1)');
          convertedText = convertedText.replace(/_\{([^}]+)\}/g, '_($1)');
          
          segments.push({
            text: convertedText,
            bold: false,
            italic: false,
            underline: false,
            strike: false,
            sup: false,
            sub: false,
            code: false,
            listItem: false,
          });
          lastIndex = match.index + match[0].length;
          continue;
        }
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
    if (plainText.trim()) {
      segments.push({
        text: plainText,
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
  
  return segments;
}

function estimateSegmentsHeight(
  doc: typeof jsPDF.prototype,
  segments: FormattedTextSegment[],
  width: number,
  lineHeight: number
): number {
  let totalLines = 0;
  let current: string[] = [];

  const flush = () => {
    const text = current.join(' ').trim();
    if (text) {
      totalLines += doc.splitTextToSize(text, width).length;
    } else {
      totalLines += 1;
    }
    current = [];
  };

  segments.forEach(seg => {
    if (seg.text === '') {
      flush();
    } else {
      current.push(seg.text);
    }
  });
  if (current.length > 0) flush();

  return totalLines * lineHeight;
}

function renderFormattedText(
  doc: typeof jsPDF.prototype,
  segments: FormattedTextSegment[],
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  fontFamily: string,
  rgb: { r: number; g: number; b: number }
): { newY: number } {
  let currentX = x;
  let currentY = y;
  const rightEdge = x + maxWidth;

  const applyFont = (segment: FormattedTextSegment, text: string = '') => {
    if (segment.code) {
      doc.setFont('Courier', 'normal');
      return;
    }
    
    // Check if text contains Devanagari characters
    const hasDevanagari = text ? containsDevanagari(text) : false;
    
    const fontStyle = [];
    if (segment.bold) fontStyle.push('bold');
    if (segment.italic) fontStyle.push('italic');
    const style = fontStyle.length > 0 ? fontStyle.join('') : 'normal';
    
    if (hasDevanagari) {
      // Use Devanagari font for Hindi text
      // Devanagari fonts often don't have true italic, fall back to normal
      const devanagariStyle = style === 'italic' ? 'normal' : style;
      doc.setFont('NotoSansDevanagari', devanagariStyle);
    } else {
      doc.setFont(fontFamily === 'Times New Roman' || fontFamily === 'Georgia' || fontFamily === 'Cambria' ? 'Times' : 'Helvetica', style);
    }
  };

  const spaceWidth = doc.getTextWidth(' ');
  let wroteAnything = false;

  segments.forEach(segment => {
    if (segment.text === '') {
      if (wroteAnything) {
        currentY += lineHeight;
        currentX = x;
        wroteAnything = false;
      } else {
        currentY += lineHeight;
        currentX = x;
      }
      return;
    }

    let textToRender = segment.text;
    if (segment.listItem) {
      if (wroteAnything) {
        currentY += lineHeight;
        currentX = x;
      }
      textToRender = '• ' + textToRender;
    }

    applyFont(segment, textToRender);

    const words = textToRender.split(/\s+/).filter((w: string) => w.length > 0);

    words.forEach((word: string) => {
      // Check each word for Devanagari and switch font if needed
      const wordHasDevanagari = containsDevanagari(word);
      if (wordHasDevanagari) {
        const fontStyle = [];
        if (segment.bold) fontStyle.push('bold');
        if (segment.italic) fontStyle.push('italic');
        const style = fontStyle.length > 0 ? fontStyle.join('') : 'normal';
        const devanagariStyle = style === 'italic' ? 'normal' : style;
        doc.setFont('NotoSansDevanagari', devanagariStyle);
      } else {
        // Switch back to Latin font for English words
        const fontStyle = [];
        if (segment.bold) fontStyle.push('bold');
        if (segment.italic) fontStyle.push('italic');
        const style = fontStyle.length > 0 ? fontStyle.join('') : 'normal';
        doc.setFont(fontFamily === 'Times New Roman' || fontFamily === 'Georgia' || fontFamily === 'Cambria' ? 'Times' : 'Helvetica', style);
      }
      
      const wordWidth = doc.getTextWidth(word);
      if (currentX > x && currentX + wordWidth > rightEdge) {
        currentY += lineHeight;
        currentX = x;
      }

      const drawX = currentX;
      if (segment.sup) {
        const originalFontSize = doc.getFontSize();
        doc.setFontSize(originalFontSize * 0.6);
        doc.text(word, drawX, currentY - 1.5);
        doc.setFontSize(originalFontSize);
      } else if (segment.sub) {
        const originalFontSize = doc.getFontSize();
        doc.setFontSize(originalFontSize * 0.6);
        doc.text(word, drawX, currentY + 1.5);
        doc.setFontSize(originalFontSize);
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
    currentY += lineHeight;
  }

  doc.setFont(fontFamily === 'Times New Roman' || fontFamily === 'Georgia' || fontFamily === 'Cambria' ? 'Times' : 'Helvetica', 'normal');
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
  availableWidth: number
): OptionRenderData[] {
  return options.map((opt, oIndex) => {
    const optPrefix = `${String.fromCharCode(97 + oIndex)}) `;
    const optText = typeof opt === 'string' ? opt : (opt.text || '');
    console.log('RAW OPTION:', JSON.stringify(optText));
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
  lineHeight: number
): number {
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

  const fontFamily = paper.styleFontFamily || 'Times New Roman';
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
    pDoc.setFont(fontFamily === 'Times New Roman' || fontFamily === 'Georgia' || fontFamily === 'Cambria' ? 'Times' : 'Helvetica', 'bold');
    pDoc.setFontSize(14);
    pDoc.text(paper.schoolName || 'SCHOOL ACADEMIC PORTAL', 105 + logoOffset / 2, 22, { align: 'center' });

    pDoc.setFontSize(11);
    pDoc.text(paper.examName || 'EXAMINATION QUESTION PAPER', 105 + logoOffset / 2, 28, { align: 'center' });

    pDoc.setFont(fontFamily === 'Times New Roman' || fontFamily === 'Georgia' || fontFamily === 'Cambria' ? 'Times' : 'Helvetica', 'normal');
    pDoc.setFontSize(9);
    const dateStr = paper.examDate ? new Date(paper.examDate).toLocaleDateString() : null;
    const teacherNameStr = paper.teacherName ? `Teacher: ${paper.teacherName}` : '';
    const infoParts = [`Class: ${paper.className || 'N/A'}`, `Subject: ${paper.subjectName || 'N/A'}`];
    if (dateStr) infoParts.push(`Date: ${dateStr}`);
    if (teacherNameStr) infoParts.push(teacherNameStr);
    pDoc.text(infoParts.join('    |    '), 105 + logoOffset / 2, 35, { align: 'center' });
    pDoc.text(`Duration: ${formatDuration(paper.duration || 0)}    |    Total Marks: ${paper.totalMarks || 0} Marks`, 105 + logoOffset / 2, 41, { align: 'center' });

    pDoc.rect(15, 52, 180, 12);
    pDoc.setFont(fontFamily === 'Times New Roman' || fontFamily === 'Georgia' || fontFamily === 'Cambria' ? 'Times' : 'Helvetica', 'bold');
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

  const fontName = fontFamily === 'Times New Roman' || fontFamily === 'Georgia' || fontFamily === 'Cambria' ? 'Times' : 'Helvetica';

  const advanceCursor = async (requiredHeight: number) => {
    if (y + requiredHeight > 297 - bottomMargin) {
      if (paper.templateType === 'SPLIT' && currentColumn === 0) {
        currentColumn = 1;
        y = pageContentStartY[currentPage] ?? 16; 
      } else {
        doc.addPage();
        currentPage++;
        await setupPage(doc, currentPage);

        doc.setFont(fontName, 'italic');
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
    const instHeight = estimateSegmentsHeight(doc, formattedInstructions, colWidth, LINE_HEIGHT);

    await advanceCursor(5 + instHeight);

    doc.setFont(fontName, 'bold');
    doc.setFontSize(10);
    doc.text('General Instructions:', getX(), y);
    y += 5;

    doc.setFont(fontName, 'normal');
    doc.setFontSize(9);

    const { newY: afterInstructionsY } = renderFormattedText(
      doc,
      formattedInstructions,
      getX(),
      y,
      colWidth,
      LINE_HEIGHT,
      fontFamily,
      rgb
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

    doc.setFont(fontName, 'bold');
    doc.setFontSize(10.5);
    doc.text(section.label, getCenterX(), y, { align: 'center' });
    y += (section.segments && section.segments.length > 0) ? 5 : SECTION_LABEL_GAP;

    if (section.segments && section.segments.length > 0) {
      for (const segment of section.segments) {
        // Find questions belonging to this segment
        const segmentQuestions = section.questions.filter((q: any) => q.segmentType === segment.type);

        // SKIP EMPTY SEGMENTS (Fixes overlapping segment headers)
        if (segmentQuestions.length === 0) continue;

        await advanceCursor(8);
        doc.setFont(fontName, 'bold');
        doc.setFontSize(9);
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

          doc.setFont(fontName, 'bold');
          doc.setFontSize(8.5);
          const instructionLines: string[] = doc.splitTextToSize(instructionText, availableWidth);

          doc.setFont(fontName, 'normal');
          doc.setFontSize(8);
          const optionLinesArr: string[][] = options.map((option) => doc.splitTextToSize(option, availableWidth));
          const totalOptionLines = optionLinesArr.reduce((sum, lines) => sum + lines.length, 0);

          const blockHeight = (instructionLines.length + totalOptionLines) * LINE_HEIGHT + LINE_HEIGHT * 2;
          await advanceCursor(blockHeight);

          doc.setFont(fontName, 'bold');
          doc.setFontSize(8.5);
          instructionLines.forEach((line: string) => {
            doc.text(line, getX() + 5, y);
            y += LINE_HEIGHT;
          });
          y += LINE_HEIGHT * 0.5;

          doc.setFont(fontName, 'normal');
          doc.setFontSize(8);
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

          doc.setFont(fontName, 'normal');
          doc.setFontSize(9.5);
          const qPrefixWidth = doc.getTextWidth(qPrefix);

          const hasImage = !!question.imageUrl;
          const maxBoxWidth = paper.templateType === 'SPLIT' ? 35 : 45;
          const maxBoxHeight = paper.templateType === 'SPLIT' ? 30 : 35;

          const textAreaWidth = colWidth - qPrefixWidth - (hasImage ? (maxBoxWidth + IMAGE_TEXT_GAP + IMAGE_RIGHT_MARGIN) : 0);

          // Handle MATCHING questions
          if (segment.type === 'MATCHING' || question.segmentType === 'MATCHING') {
            const matchingPairs = question.matchingPairs || [];
            const pairCount = matchingPairs.length;
            
            // Estimate height for matching pairs (2 columns)
            const pairHeight = LINE_HEIGHT * 1.2;
            const totalMatchingHeight = pairCount * pairHeight + 10;
            
            await advanceCursor(totalMatchingHeight);
            
            doc.text(qPrefix, getX(), y);
            y += LINE_HEIGHT;
            
            // Render column headers
            doc.setFont(fontName, 'bold');
            doc.setFontSize(8.5);
            const headerY = y;
            doc.text('Column A', getX() + qPrefixWidth + 5, headerY);
            doc.text('Column B', getX() + qPrefixWidth + colWidth / 2 + 5, headerY);
            y += LINE_HEIGHT * 1.5;
            
            // Render matching pairs in 2 columns
            doc.setFont(fontName, 'normal');
            doc.setFontSize(9);
            
            for (let i = 0; i < pairCount; i++) {
              const pair = matchingPairs[i];
              if (!pair) continue;
              const leftLabel = `${String.fromCharCode(65 + i)}.`;
              const rightLabel = `${i + 1}.`;
              
              // Column A
              doc.text(`${leftLabel} ${pair.left || ''}`, getX() + qPrefixWidth + 5, y);
              
              // Column B
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
            const passageHeight = estimateSegmentsHeight(doc, formattedPassage, textAreaWidth, LINE_HEIGHT);
            
            // Calculate height for instruction line and sub-questions
            const instructionHeight = LINE_HEIGHT * 1.5;
            let subQuestionsHeight = 0;
            subQuestions.forEach((sq: any) => {
              const formattedSQ = parseHtmlToFormattedText(sq.text || '');
              subQuestionsHeight += estimateSegmentsHeight(doc, formattedSQ, textAreaWidth, LINE_HEIGHT) + LINE_HEIGHT;
            });
            
            const totalPassageHeight = passageHeight + instructionHeight + subQuestionsHeight + 20;
            
            await advanceCursor(totalPassageHeight);
            
            doc.text(qPrefix, getX(), y);
            y += LINE_HEIGHT;
            
            // Render passage text
            doc.setFont(fontName, 'italic');
            doc.setFontSize(9);
            
            const { newY: afterPassageY } = renderFormattedText(
              doc,
              formattedPassage,
              getX() + qPrefixWidth,
              y,
              textAreaWidth,
              LINE_HEIGHT,
              fontFamily,
              rgb
            );
            y = afterPassageY + LINE_HEIGHT;
            
            // Render instruction line
            doc.setFont(fontName, 'bold');
            doc.setFontSize(8.5);
            doc.text('Answer the following questions based on the above passage:', getX() + qPrefixWidth, y);
            y += LINE_HEIGHT * 1.5;
            
            // Render sub-questions with lettered format
            doc.setFont(fontName, 'normal');
            doc.setFontSize(9);
            
            subQuestions.forEach((sq: any, index: number) => {
              const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't'];
              const sqPrefix = `${letters[index]})`;
              const sqPrefixWidth = doc.getTextWidth(sqPrefix);
              const formattedSQ = parseHtmlToFormattedText(sq.text || '');
              
              doc.text(sqPrefix, getX() + qPrefixWidth, y);
              
              const { newY: afterSQY } = renderFormattedText(
                doc,
                formattedSQ,
                getX() + qPrefixWidth + sqPrefixWidth,
                y,
                textAreaWidth - sqPrefixWidth,
                LINE_HEIGHT,
                fontFamily,
                rgb
              );
              y = afterSQY + LINE_HEIGHT;
            });
            
            y += QUESTION_GAP;
            continue;
          }

          // Handle ASSERTION_REASONING questions
          if (segment.type === 'ASSERTION_REASONING' || question.segmentType === 'ASSERTION_REASONING') {
            const assertion = question.assertion || '';
            const reason = question.reason || '';
            
            const formattedAssertion = parseHtmlToFormattedText(assertion);
            const formattedReason = parseHtmlToFormattedText(reason);
            
            const assertionHeight = estimateSegmentsHeight(doc, formattedAssertion, textAreaWidth, LINE_HEIGHT);
            const reasonHeight = estimateSegmentsHeight(doc, formattedReason, textAreaWidth, LINE_HEIGHT);
            const totalARHeight = assertionHeight + reasonHeight + LINE_HEIGHT * 3 + 10;
            
            await advanceCursor(totalARHeight);
            
            doc.text(qPrefix, getX(), y);
            y += LINE_HEIGHT;
            
            // Render Assertion (A)
            doc.setFont(fontName, 'bold');
            doc.setFontSize(9);
            doc.text('Assertion (A):', getX() + qPrefixWidth, y);
            y += LINE_HEIGHT;
            
            doc.setFont(fontName, 'normal');
            const { newY: afterAssertionY } = renderFormattedText(
              doc,
              formattedAssertion,
              getX() + qPrefixWidth,
              y,
              textAreaWidth,
              LINE_HEIGHT,
              fontFamily,
              rgb
            );
            y = afterAssertionY + LINE_HEIGHT;
            
            // Render Reason (R)
            doc.setFont(fontName, 'bold');
            doc.setFontSize(9);
            doc.text('Reason (R):', getX() + qPrefixWidth, y);
            y += LINE_HEIGHT;
            
            doc.setFont(fontName, 'normal');
            const { newY: afterReasonY } = renderFormattedText(
              doc,
              formattedReason,
              getX() + qPrefixWidth,
              y,
              textAreaWidth,
              LINE_HEIGHT,
              fontFamily,
              rgb
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

          const totalHeight = estimateSegmentsHeight(doc, formattedSegments, textAreaWidth, LINE_HEIGHT);

          let optionsData: OptionRenderData[] = [];
          let totalOptionsHeight = 0;
          const isMCQ = segment.type === 'MCQ' || question.segmentType === 'MCQ';

          if (isMCQ && question.options && question.options.length > 0) {
            optionsData = buildOptionRenderData(doc, question.options, colWidth / 2 - 5);
            // Calculate height as max height of side-by-side columns
            const leftLines = (optionsData[0]?.lines.length || 0) + (optionsData[1]?.lines.length || 0);
            const rightLines = (optionsData[2]?.lines.length || 0) + (optionsData[3]?.lines.length || 0);
            totalOptionsHeight = Math.max(leftLines, rightLines) * LINE_HEIGHT;
          }

          const textAndImageHeight = Math.max(totalHeight, (hasImage && scaledHeight > 0) ? scaledHeight - 3 : 0);
          const requiredHeight = textAndImageHeight + totalOptionsHeight + QUESTION_GAP;

          await advanceCursor(requiredHeight);

          const questionStartY = y;

          doc.setFont(fontName, 'normal');
          doc.setFontSize(9.5);
          doc.text(qPrefix, getX(), y);

          const { newY: afterQuestionY } = renderFormattedText(
            doc,
            formattedSegments,
            getX() + qPrefixWidth,
            y,
            textAreaWidth,
            LINE_HEIGHT,
            fontFamily,
            rgb
          );
          y = afterQuestionY;

          // Render image on right side if present
          if (hasImage && imgBase64 && scaledWidth > 0 && scaledHeight > 0) {
            try {
              const imgX = getX() + colWidth - IMAGE_RIGHT_MARGIN - scaledWidth; // Position on right side
              doc.addImage(imgBase64, 'PNG', imgX, questionStartY - 3, scaledWidth, scaledHeight);
              // Make sure the cursor clears the image too, not just the text.
              y = Math.max(y, questionStartY - 3 + scaledHeight);
            } catch (e) {
              console.warn('Failed to render question image:', e);
            }
          }

          if (isMCQ && optionsData.length > 0) {
            const halfColWidth = colWidth / 2;
            const startY = y;

            const leftY = renderOptionColumn(doc, optionsData.slice(0, 2), getX(), startY, LINE_HEIGHT);
            const rightY = renderOptionColumn(doc, optionsData.slice(2, 4), getX() + halfColWidth, startY, LINE_HEIGHT);

            y = Math.max(leftY, rightY);
          }

          y += QUESTION_GAP;

          // Render alternative questions (internal choice)
          const alternatives = question.alternatives || [];
          for (const alt of alternatives) {
            if (!alt.questionText) continue;

            // Render OR separator
            doc.setFont(fontName, 'bold');
            doc.setFontSize(9.5);
            doc.text('OR', getX(), y);
            y += LINE_HEIGHT;

            const altFormattedSegments = parseHtmlToFormattedText(alt.questionText);

            const altTotalHeight = estimateSegmentsHeight(doc, altFormattedSegments, textAreaWidth, LINE_HEIGHT);

            let altOptionsData: OptionRenderData[] = [];
            let altTotalOptionsHeight = 0;
            const altIsMCQ = segment.type === 'MCQ' || question.segmentType === 'MCQ';

            if (altIsMCQ && alt.options && alt.options.length > 0) {
              altOptionsData = buildOptionRenderData(doc, alt.options, colWidth / 2 - 5);
              const altLeftLines = (altOptionsData[0]?.lines.length || 0) + (altOptionsData[1]?.lines.length || 0);
              const altRightLines = (altOptionsData[2]?.lines.length || 0) + (altOptionsData[3]?.lines.length || 0);
              altTotalOptionsHeight = Math.max(altLeftLines, altRightLines) * LINE_HEIGHT;
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
              fontFamily,
              rgb
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
              const startY = y;

              const leftY = renderOptionColumn(doc, altOptionsData.slice(0, 2), getX(), startY, LINE_HEIGHT);
              const rightY = renderOptionColumn(doc, altOptionsData.slice(2, 4), getX() + halfColWidth, startY, LINE_HEIGHT);

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

        doc.setFont(fontName, 'normal');
        doc.setFontSize(9.5);
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

        const totalHeight = estimateSegmentsHeight(doc, formattedSegments, textAreaWidth, LINE_HEIGHT);

        let optionsData: OptionRenderData[] = [];
        let totalOptionsHeight = 0;
        const isMCQ = section.type === 'MCQ' || question.segmentType === 'MCQ';

        if (isMCQ && question.options && question.options.length > 0) {
          optionsData = buildOptionRenderData(doc, question.options, colWidth / 2 - 5);
          const leftLines = (optionsData[0]?.lines.length || 0) + (optionsData[1]?.lines.length || 0);
          const rightLines = (optionsData[2]?.lines.length || 0) + (optionsData[3]?.lines.length || 0);
          totalOptionsHeight = Math.max(leftLines, rightLines) * LINE_HEIGHT;
        }

        const textAndImageHeight = Math.max(totalHeight, (hasImage && scaledHeight > 0) ? scaledHeight - 3 : 0);
        const requiredHeight = textAndImageHeight + totalOptionsHeight + QUESTION_GAP;

        await advanceCursor(requiredHeight);

        const questionStartY = y;

        doc.setFont(fontName, 'normal');
        doc.setFontSize(9.5);
        doc.text(qPrefix, getX(), y);

        const { newY: afterQuestionY } = renderFormattedText(
          doc,
          formattedSegments,
          getX() + qPrefixWidth,
          y,
          textAreaWidth,
          LINE_HEIGHT,
          fontFamily,
          rgb
        );
        y = afterQuestionY;

        // Render image on right side if present
        if (hasImage && imgBase64 && scaledWidth > 0 && scaledHeight > 0) {
          try {
            const imgX = getX() + colWidth - IMAGE_RIGHT_MARGIN - scaledWidth; // Position on right side
            doc.addImage(imgBase64, 'PNG', imgX, questionStartY - 3, scaledWidth, scaledHeight);
            y = Math.max(y, questionStartY - 3 + scaledHeight);
          } catch (e) {
            console.warn('Failed to render question image:', e);
          }
        }

        if (isMCQ && optionsData.length > 0) {
          const halfColWidth = colWidth / 2;
          const startY = y;

          const leftY = renderOptionColumn(doc, optionsData.slice(0, 2), getX(), startY, LINE_HEIGHT);
          const rightY = renderOptionColumn(doc, optionsData.slice(2, 4), getX() + halfColWidth, startY, LINE_HEIGHT);

          y = Math.max(leftY, rightY);
        }

        y += QUESTION_GAP;

        // Render alternative questions (internal choice)
        const alternatives = question.alternatives || [];
        for (const alt of alternatives) {
          if (!alt.questionText) continue;

          // Render OR separator
          doc.setFont(fontName, 'bold');
          doc.setFontSize(9.5);
          doc.text('OR', getX(), y);
          y += LINE_HEIGHT;

          const altFormattedSegments = parseHtmlToFormattedText(alt.questionText);

          const altTotalHeight = estimateSegmentsHeight(doc, altFormattedSegments, textAreaWidth, LINE_HEIGHT);

          let altOptionsData: OptionRenderData[] = [];
          let altTotalOptionsHeight = 0;
          const altIsMCQ = section.type === 'MCQ' || question.segmentType === 'MCQ';

          if (altIsMCQ && alt.options && alt.options.length > 0) {
            altOptionsData = buildOptionRenderData(doc, alt.options, colWidth / 2 - 5);
            const altLeftLines = (altOptionsData[0]?.lines.length || 0) + (altOptionsData[1]?.lines.length || 0);
            const altRightLines = (altOptionsData[2]?.lines.length || 0) + (altOptionsData[3]?.lines.length || 0);
            altTotalOptionsHeight = Math.max(altLeftLines, altRightLines) * LINE_HEIGHT;
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
            fontFamily,
            rgb
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
            const startY = y;

            const leftY = renderOptionColumn(doc, altOptionsData.slice(0, 2), getX(), startY, LINE_HEIGHT);
            const rightY = renderOptionColumn(doc, altOptionsData.slice(2, 4), getX() + halfColWidth, startY, LINE_HEIGHT);

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