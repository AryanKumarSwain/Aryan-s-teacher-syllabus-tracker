import { Document, Page, Text, View, StyleSheet, Image, renderToStream, Font } from '@react-pdf/renderer';
import React from 'react';
import { prisma } from '@school-syllabus/database';
import { toRoman } from '../utils/roman.js';

Font.register({
  family: 'Helvetica',
});

const createStyles = (fontFamily: string = 'Helvetica', fontSize: number = 11, color: string = '#000000') => StyleSheet.create({
  page: { padding: 28, fontSize, fontFamily },
  header: { marginBottom: 16, flexDirection: 'row', gap: 12 },
  logoContainer: { width: 70, height: 70 },
  infoBox: { 
    flex: 1, 
    border: 1, 
    borderColor: '#000000', 
    padding: 8,
    alignItems: 'center',
  },
  schoolName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  examName: { fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  metaRow: { fontSize: 10, flexDirection: 'row', gap: 8 },
  metaLabel: { fontWeight: 'bold' },
  studentInfo: { 
    marginBottom: 16, 
    flexDirection: 'row', 
    gap: 24,
    padding: 8,
    border: 1,
    borderColor: '#d1d5db',
  },
  studentInfoLabel: { fontWeight: 'bold', fontSize: 10 },
  studentInfoLine: { flex: 1, borderBottom: 1, borderColor: '#000000' },
  instructionsBox: { 
    marginBottom: 16, 
    backgroundColor: '#f5f5f5', 
    border: 1, 
    borderColor: '#d1d5db', 
    padding: 8,
  },
  instructionsTitle: { fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  instructionsText: { fontSize: 10 },
  section: { marginTop: 12, border: 1, borderColor: '#d1d5db', padding: 8 },
  sectionTitle: { fontWeight: 'bold', marginBottom: 6 },
  question: { marginTop: 8, flexDirection: 'row', gap: 8 },
  questionText: { flex: 1, color },
  questionImage: { width: 150, height: 150, objectFit: 'contain' },
  optionsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  footer: { 
    marginTop: 20, 
    fontSize: 9, 
    color: '#4b5563',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  watermark: { 
    fontSize: 8, 
    color: '#9ca3af', 
    fontStyle: 'italic',
  },
});

function parseHtmlToRuns(html: string): Array<{ text: string; color?: string; bold?: boolean; italic?: boolean }> {
  const runs: Array<{ text: string; color?: string; bold?: boolean; italic?: boolean }> = [];
  let currentColor = '#000000';
  let currentBold = false;
  let currentItalic = false;
  
  // Simple regex-based HTML parser for Tiptap output - handle all tags
  const tagRegex = /<(\/?)([a-z][a-z0-9]*)([^>]*)>|([^<]+)/gi;
  let match;
  
  while ((match = tagRegex.exec(html)) !== null) {
    const [, closing, tag, attrs, text] = match;
    
    if (text) {
      if (text.trim()) {
        runs.push({
          text: text,
          color: currentColor,
          bold: currentBold,
          italic: currentItalic,
        });
      }
    } else if (closing) {
      // Closing tag - reset style
      if (tag === 'span') currentColor = '#000000';
      if (tag === 'strong') currentBold = false;
      if (tag === 'em') currentItalic = false;
    } else {
      // Opening tag - apply style
      if (tag === 'span') {
        const colorMatch = attrs.match(/color:\s*([^;"]+)/i);
        if (colorMatch) currentColor = colorMatch[1].trim();
      }
      if (tag === 'strong') currentBold = true;
      if (tag === 'em') currentItalic = true;
      // Ignore other tags like p, br, etc.
    }
  }
  
  return runs;
}

function renderQuestionText(question: { questionText: string }) {
  const html = question.questionText;
  const runs = parseHtmlToRuns(html);
  
  return React.createElement(
    Text,
    null,
    ...runs.map((run, index) =>
      React.createElement(
        Text,
        {
          key: index,
          style: {
            color: run.color || '#000000',
            fontWeight: run.bold ? 'bold' : 'normal',
            fontStyle: run.italic ? 'italic' : 'normal',
          },
        },
        run.text
      )
    )
  );
}

export async function generateExamPaperPdfBuffer(
  examPaperId: string,
  options?: { fontFamily?: string; fontSize?: number; color?: string; rollNumber?: string }
) {
  const examPaper = await prisma.examPaper.findUnique({
    where: { id: examPaperId },
    include: {
      school: { select: { name: true } },
      class: { select: { name: true, grade: true, section: true } },
      subject: { select: { name: true } },
      teacher: { select: { user: { select: { name: true } } } },
      sections: { include: { questions: true }, orderBy: { order: 'asc' } },
    },
  });

  if (!examPaper) throw new Error('Exam paper not found');

  const template = await prisma.examPaperTemplate.findUnique({ where: { schoolId: examPaper.schoolId } });
  
  // Use paper instructions if available, otherwise fall back to template instructions
  const instructions = examPaper.instructions || template?.instructions;

  // Get styling options from exam paper or use defaults
  const fontFamily = options?.fontFamily || examPaper.styleFontFamily || 'Helvetica';
  const fontSize = options?.fontSize || parseInt(examPaper.styleFontSize || '11');
  const color = options?.color || examPaper.styleColor || '#000000';
  const rollNumber = options?.rollNumber || '';

  // Use Helvetica as default font (custom fonts require font file registration)
  // For now, we'll use the fontFamily in styles but it will only work with registered fonts
  const effectiveFontFamily = 'Helvetica'; // Always use Helvetica for now
  const styles = createStyles(effectiveFontFamily, fontSize, color);

  const headerElements = [
    React.createElement(
      View,
      { style: styles.header },
      React.createElement(
        View,
        { style: styles.logoContainer },
        template?.logoUrl ? React.createElement(Image, { src: template.logoUrl, style: { width: 70, height: 70 } }) : null,
      ),
      React.createElement(
        View,
        { style: styles.infoBox },
        React.createElement(Text, { style: styles.schoolName }, examPaper.school.name),
        React.createElement(Text, { style: styles.examName }, examPaper.examName),
        React.createElement(
          View,
          { style: styles.metaRow },
          React.createElement(Text, null, React.createElement(Text, { style: styles.metaLabel }, 'GRADE : '), examPaper.class.grade || examPaper.class.name),
          React.createElement(Text, null, React.createElement(Text, { style: styles.metaLabel }, 'SUBJECT : '), examPaper.subject.name),
          React.createElement(Text, null, React.createElement(Text, { style: styles.metaLabel }, 'M.M : '), examPaper.totalMarks || 'N/A'),
          React.createElement(Text, null, React.createElement(Text, { style: styles.metaLabel }, 'TEACHER : '), examPaper.teacher?.user?.name || 'N/A'),
        ),
      ),
    ),
  ];

  const studentInfoElements = [
    React.createElement(
      View,
      { style: styles.studentInfo },
      React.createElement(
        View,
        { style: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 } },
        React.createElement(Text, { style: styles.studentInfoLabel }, 'Name:'),
        React.createElement(View, { style: styles.studentInfoLine }),
      ),
      React.createElement(
        View,
        { style: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 } },
        React.createElement(Text, { style: styles.studentInfoLabel }, 'Roll No:'),
        React.createElement(Text, { style: { fontSize: 10, fontWeight: 'bold' } }, rollNumber || ''),
      ),
    ),
  ];

  const instructionsElements = instructions ? [
    React.createElement(
      View,
      { style: styles.instructionsBox },
      React.createElement(Text, { style: styles.instructionsTitle }, 'Instructions'),
      React.createElement(Text, { style: styles.instructionsText }, instructions),
    ),
  ] : [];

  const sectionElements = examPaper.sections.map((section, sectionIndex) =>
    React.createElement(
      View,
      { key: section.id, style: styles.section },
      React.createElement(
        Text,
        { style: styles.sectionTitle },
        `${section.label} (${section.marksEach} mark${section.marksEach !== 1 ? 's' : ''} each × ${section.questions.length} = ${section.marksEach * section.questions.length} marks)`,
      ),
      ...section.questions.map((question, questionIndex) =>
        React.createElement(
          View,
          { key: question.id, style: styles.question },
          React.createElement(
            View,
            { style: styles.questionText },
            React.createElement(Text, null, `(${toRoman(questionIndex + 1)}) `),
            renderQuestionText(question),
            section.type === 'MCQ' && question.options && Array.isArray(question.options) && question.options.length > 0
              ? React.createElement(
                  View,
                  { style: styles.optionsContainer },
                  ...question.options.map((option: any, optIndex: number) =>
                    React.createElement(
                      Text,
                      { key: optIndex },
                      `${String.fromCharCode(97 + optIndex)}) ${option.text || option} `
                    )
                  )
                )
              : null,
          ),
          question.imageUrl ? React.createElement(Image, { src: question.imageUrl, style: styles.questionImage }) : null,
        ),
      ),
    ),
  );

  const document = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { 
        size: 'A4', 
        style: styles.page,
      },
      ...headerElements,
      ...studentInfoElements,
      ...instructionsElements,
      ...sectionElements,
      React.createElement(
        View,
        { style: styles.footer, fixed: true },
        React.createElement(
          Text,
          { renderText: ({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}` },
        ),
        React.createElement(Text, { style: styles.watermark }, 'Syllabus Tracker'),
      ),
    ),
  );

  const stream = await renderToStream(document as React.ReactElement);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
