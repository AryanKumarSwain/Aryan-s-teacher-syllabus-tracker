import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

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
  sections: Array<{
    label: string;
    type: string;
    marksEach: number;
    questions: Array<{
      questionText: string;
      subject?: string;
      options?: Array<{ text: string; isCorrect?: boolean } | string>;
    }>;
  }>;
}

function cleanHtmlText(html: string): string {
  if (!html) return '';
  let text = html;
  
  // Replace paragraph ends/line breaks with newlines
  text = text.replace(/<\/p>/g, '\n');
  text = text.replace(/<br\s*\/?>/g, '\n');
  text = text.replace(/<li>/g, '• ');
  text = text.replace(/<\/li>/g, '\n');
  
  // Strip all other HTML tags
  text = text.replace(/<[^>]+>/g, '');
  
  // Decode common HTML entities
  text = text.replace(/&nbsp;/g, ' ')
             .replace(/&amp;/g, '&')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&quot;/g, '"')
             .replace(/&#39;/g, "'");
             
  // Trim duplicate blank lines
  const lines = text.split('\n').map(line => line.trim());
  return lines.filter((line, i) => line !== '' || (lines[i - 1] !== '' && i > 0)).join('\n');
}

export async function generateExamPaperPdf(paper: PdfPaperData, rollNumber?: string): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const fontFamily = paper.styleFontFamily || 'Times New Roman';
  const fontColor = paper.styleColor || '#000000';
  
  // Hex to RGB
  const hexToRgb = (hex: string) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  const rgb = hexToRgb(fontColor);
  let currentPage = 1;
  
  const setupPage = (pDoc: typeof doc, pNum: number) => {
    pDoc.saveGraphicsState();
    try {
      // Set opacity for watermark
      // @ts-ignore
      pDoc.setGState(new pDoc.GState({ opacity: 0.05 }));
    } catch {
      pDoc.setTextColor(240, 240, 240); // fallback for compatibility
    }
    pDoc.setFont('Helvetica', 'bold');
    pDoc.setFontSize(60);
    pDoc.setTextColor(150, 150, 150);
    pDoc.text('CONFIDENTIAL', 105, 150, { align: 'center', angle: 45 });
    pDoc.restoreGraphicsState();

    // Standard styling
    pDoc.setTextColor(rgb.r, rgb.g, rgb.b);

    // Footer
    pDoc.setFont('Helvetica', 'normal');
    pDoc.setFontSize(8);
    pDoc.setTextColor(120, 120, 120);
    pDoc.text(`Page ${pNum}`, 105, 287, { align: 'center' });
    pDoc.text('CONFIDENTIAL EXAM SHEET', 15, 287);
    pDoc.text('Syllabus Tracker', 195, 287, { align: 'right' });
    pDoc.setTextColor(rgb.r, rgb.g, rgb.b);
  };

  const drawPageHeader = (pDoc: typeof doc, pRoll?: string) => {
    pDoc.setLineWidth(0.3);
    pDoc.setDrawColor(180, 180, 180);
    pDoc.rect(15, 15, 180, 32);

    pDoc.setFont(fontFamily === 'Times New Roman' || fontFamily === 'Georgia' || fontFamily === 'Cambria' ? 'Times' : 'Helvetica', 'bold');
    pDoc.setFontSize(14);
    pDoc.text(paper.schoolName || 'SCHOOL ACADEMIC PORTAL', 105, 22, { align: 'center' });

    pDoc.setFontSize(11);
    pDoc.text(paper.examName || 'EXAMINATION QUESTION PAPER', 105, 28, { align: 'center' });

    pDoc.setFont(fontFamily === 'Times New Roman' || fontFamily === 'Georgia' || fontFamily === 'Cambria' ? 'Times' : 'Helvetica', 'normal');
    pDoc.setFontSize(9);
    const dateStr = paper.examDate ? new Date(paper.examDate).toLocaleDateString() : 'N/A';
    pDoc.text(`Grade: ${paper.className || 'N/A'}    |    Subject: ${paper.subjectName || 'N/A'}    |    Date: ${dateStr}`, 105, 35, { align: 'center' });
    pDoc.text(`Duration: ${paper.duration || 0} Mins    |    Total Marks: ${paper.totalMarks || 0} Marks`, 105, 41, { align: 'center' });

    pDoc.rect(15, 52, 180, 12);
    pDoc.setFont(fontFamily === 'Times New Roman' || fontFamily === 'Georgia' || fontFamily === 'Cambria' ? 'Times' : 'Helvetica', 'bold');
    pDoc.setFontSize(9);
    pDoc.text('Student Name: _____________________________________', 18, 60);
    pDoc.text(`Roll Number: ${pRoll || '__________________'}`, 132, 60);
  };

  setupPage(doc, currentPage);
  drawPageHeader(doc, rollNumber);

  let colWidth = paper.templateType === 'SPLIT' ? 85 : 180;
  let leftMargin = 15;
  let topMargin = 72;
  let bottomMargin = 20;
  let currentColumn = 0; // 0 = Left, 1 = Right (for split template)
  let y = topMargin;

  const fontName = fontFamily === 'Times New Roman' || fontFamily === 'Georgia' || fontFamily === 'Cambria' ? 'Times' : 'Helvetica';

  const advanceCursor = (requiredHeight: number) => {
    if (y + requiredHeight > 297 - bottomMargin) {
      if (paper.templateType === 'SPLIT' && currentColumn === 0) {
        currentColumn = 1;
        y = 72; // Start from top of Right Column
      } else {
        doc.addPage();
        currentPage++;
        setupPage(doc, currentPage);

        // Header on subsequent pages
        doc.setFont(fontName, 'italic');
        doc.setFontSize(8);
        doc.text(`${paper.examName} - ${paper.subjectName}`, 15, 12);
        if (rollNumber) {
          doc.text(`Roll Number: ${rollNumber}`, 195, 12, { align: 'right' });
        }
        doc.line(15, 14, 195, 14);

        currentColumn = 0;
        y = 20; // reset y to smaller margin for next pages
      }
    }
  };

  const getX = () => {
    if (paper.templateType === 'SPLIT') {
      return currentColumn === 0 ? 15 : 110;
    }
    return 15;
  };

  // Render instructions
  if (paper.instructions) {
    doc.setFont(fontName, 'bold');
    doc.setFontSize(10);
    advanceCursor(12);
    doc.text('General Instructions:', getX(), y);
    y += 5;

    doc.setFont(fontName, 'normal');
    doc.setFontSize(9);
    const instLines = doc.splitTextToSize(paper.instructions, colWidth);
    
    instLines.forEach((line: string) => {
      advanceCursor(4.5);
      doc.text(line, getX(), y);
      y += 4.5;
    });
    y += 3;
  }

  const drawMiddleSplitLine = () => {
    if (paper.templateType === 'SPLIT') {
      const current_page = doc.getCurrentPageInfo().pageNumber;
      doc.setPage(current_page);
      doc.setLineWidth(0.2);
      doc.setDrawColor(200, 200, 200);
      doc.line(105, 72, 105, 280);
      doc.setDrawColor(rgb.r, rgb.g, rgb.b); // restore color
    }
  };

  // Render sections
  for (let sIndex = 0; sIndex < paper.sections.length; sIndex++) {
    const section = paper.sections[sIndex];
    advanceCursor(12);
    
    doc.setFont(fontName, 'bold');
    doc.setFontSize(10.5);
    const secHeader = `${section.label} - (${section.marksEach} Mark${section.marksEach > 1 ? 's' : ''} Each)`;
    doc.text(secHeader, getX(), y);
    y += 5;

    for (let qIndex = 0; qIndex < section.questions.length; qIndex++) {
      const question = section.questions[qIndex];
      const qPrefix = `Q${qIndex + 1}. `;
      const subjectSuffix = question.subject ? `  [Topic: ${question.subject}]` : '';
      
      const qTextClean = cleanHtmlText(question.questionText);
      const fullText = qPrefix + qTextClean + subjectSuffix;
      const qLines = doc.splitTextToSize(fullText, colWidth);
      
      let optionsLinesList: string[][] = [];
      let totalOptionsHeight = 0;
      const isMCQ = section.type === 'MCQ';
      
      if (isMCQ && question.options && question.options.length > 0) {
        question.options.forEach((opt: any, oIndex: number) => {
          const optPrefix = `   ${String.fromCharCode(97 + oIndex)}) `;
          const optText = typeof opt === 'string' ? opt : (opt.text || '');
          const optLines = doc.splitTextToSize(optPrefix + optText, colWidth);
          optionsLinesList.push(optLines);
          totalOptionsHeight += optLines.length * 4.5;
        });
      }

      const qHeight = (qLines.length * 4.5) + totalOptionsHeight + 6;
      advanceCursor(qHeight);

      doc.setFont(fontName, 'normal');
      doc.setFontSize(9.5);
      
      qLines.forEach((line: string) => {
        doc.text(line, getX(), y);
        y += 4.5;
      });

      if (isMCQ && optionsLinesList.length > 0) {
        optionsLinesList.forEach((optLines) => {
          optLines.forEach((line) => {
            doc.text(line, getX(), y);
            y += 4.5;
          });
        });
      }

      y += 2.5; // spacing
    }
    y += 3;
  }

  // Draw vertical split lines across all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawMiddleSplitLine();
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
