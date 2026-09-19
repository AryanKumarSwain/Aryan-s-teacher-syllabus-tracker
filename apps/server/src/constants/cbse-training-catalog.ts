export interface CpdTopicCatalogItem {
  id: string;
  title: string;
  domain: 'CORE_VALUES_ETHICS' | 'KNOWLEDGE_PRACTICE' | 'PROFESSIONAL_GROWTH';
  annexure: 'ANNEXURE_I' | 'ANNEXURE_II' | 'ANNEXURE_III' | 'ACADEMIC_ACTIVITY';
  defaultHours: number;
  description?: string;
  recommendedMode?: 'OFFLINE' | 'ONLINE' | 'BLENDED';
}

export const ANNEXURE_I_TOPICS: CpdTopicCatalogItem[] = [
  { id: 'ann1-1', title: 'Adolescent Education Programme', domain: 'CORE_VALUES_ETHICS', annexure: 'ANNEXURE_I', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann1-2', title: 'Ethics & Integrity', domain: 'CORE_VALUES_ETHICS', annexure: 'ANNEXURE_I', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann1-3', title: 'Gender Sensitivity in Schools', domain: 'CORE_VALUES_ETHICS', annexure: 'ANNEXURE_I', defaultHours: 6, description: '1 Day = 06 hours' },
  { id: 'ann1-4', title: 'Inclusive Education', domain: 'CORE_VALUES_ETHICS', annexure: 'ANNEXURE_I', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann1-5', title: 'Life skills (Advance)', domain: 'CORE_VALUES_ETHICS', annexure: 'ANNEXURE_I', defaultHours: 6, description: '1 Day = 06 hours' },
  { id: 'ann1-6', title: 'Life skills (Basic)', domain: 'CORE_VALUES_ETHICS', annexure: 'ANNEXURE_I', defaultHours: 6, description: '1 Day = 06 hours' },
  { id: 'ann1-7', title: 'Promoting Mental Health and Wellness among Students', domain: 'CORE_VALUES_ETHICS', annexure: 'ANNEXURE_I', defaultHours: 6, description: '1 Day = 06 hours' },
  { id: 'ann1-8', title: 'School Health & Wellness', domain: 'CORE_VALUES_ETHICS', annexure: 'ANNEXURE_I', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann1-9', title: 'Values Education', domain: 'CORE_VALUES_ETHICS', annexure: 'ANNEXURE_I', defaultHours: 6, description: '1 Day = 06 hours' },
];

export const ANNEXURE_II_TOPICS: CpdTopicCatalogItem[] = [
  { id: 'ann2-1', title: 'School Libraries', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 6, description: '1 Day = 06 hours' },
  { id: 'ann2-2', title: 'Active Learning', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 6, description: '1 Day = 06 hours' },
  { id: 'ann2-3', title: 'Art Integration', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 6, description: '1 Day = 06 hours' },
  { id: 'ann2-4', title: 'Competency-Based Assessment (Secondary Level)- Generic', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann2-5', title: 'Critical & Creative Thinking', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann2-6', title: 'Experiential Learning', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann2-7', title: 'Learning outcomes & Pedagogies', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 6, description: '1 Day = 06 hours' },
  { id: 'ann2-8', title: 'Storytelling as Pedagogy', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 6, description: '1 Day = 06 hours' },
  { id: 'ann2-9', title: 'Strengthening Assessment & Evaluation Practices', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann2-10', title: 'Biology (Senior Secondary Classes)', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann2-11', title: 'Chemistry (Senior Secondary Classes)', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann2-12', title: 'Environmental Studies (Elementary Classes)', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 6, description: '1 Day = 06 hours' },
  { id: 'ann2-13', title: 'Physics (Senior Secondary Classes)', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann2-14', title: 'Python (Senior Secondary Classes)- Computer Science', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann2-15', title: 'Python (Senior Secondary Classes)- Informatic Practices', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann2-16', title: 'Python (Basic)', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 6, description: '1 Day = 06 hours' },
  { id: 'ann2-17', title: 'Mathematics (Secondary Classes)', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann2-18', title: 'Science (Secondary Classes)', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann2-19', title: 'Mathematics (Elementary Classes)', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann2-20', title: 'Science (Elementary Classes)', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 6, description: '1 Day = 06 hours' },
  { id: 'ann2-21', title: 'Joyful Mathematics', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann2-22', title: 'Competency Based Assessment (Secondary Level)- Mathematics', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann2-23', title: 'Competency Based Assessment (Secondary Level)- Science', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann2-24', title: 'Cyber Safety & Security', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 6, description: '1 Day = 06 hours' },
  { id: 'ann2-25', title: 'Disaster Management', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 6, description: '1 Day = 06 hours' },
  { id: 'ann2-26', title: 'Environmental Education and Conservation of Natural Resources', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 6, description: '1 Day = 06 hours' },
  { id: 'ann2-27', title: 'Use of Artificial Intelligence in Classrooms', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 6, description: '1 Day = 06 hours' },
  { id: 'ann2-28', title: 'Accountancy (Senior Secondary Classes)', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann2-29', title: 'Business Studies (Senior Secondary Classes)', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann2-30', title: 'Economics (Senior Secondary Classes)', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann2-31', title: 'English core (Senior Secondary Classes)', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann2-32', title: 'Geography (Senior Secondary Classes)', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann2-33', title: 'History (Senior Secondary Classes)', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann2-34', title: 'Political Science (Senior Secondary Classes)', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann2-35', title: 'Psychology (Senior Secondary Classes)', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann2-36', title: 'Hindi Course-A (Secondary Classes)', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann2-37', title: 'Social Science (Secondary Classes)', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann2-38', title: 'Tamil (Secondary Classes)', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann2-39', title: 'English Language literature', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann2-40', title: 'Competency Based Assessment (Secondary Level)- English', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann2-41', title: 'Competency Based Assessment (Secondary Level)- Social Science', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann2-42', title: 'Kannada (Secondary level)', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann2-43', title: 'Malayalam (Secondary level)', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann2-44', title: 'Punjabi', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann2-45', title: 'Physical Education (Senior Secondary Level)', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann2-46', title: 'Hindi B', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann2-47', title: 'Sanskrit (Secondary Level)', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann2-48', title: 'Educating Parents about Education', domain: 'KNOWLEDGE_PRACTICE', annexure: 'ANNEXURE_II', defaultHours: 6, description: '1 Day = 06 hours' },
];

export const ANNEXURE_III_TOPICS: CpdTopicCatalogItem[] = [
  { id: 'ann3-1', title: 'National Curriculum Framework for School Education 2023 (NCF-SE)', domain: 'PROFESSIONAL_GROWTH', annexure: 'ANNEXURE_III', defaultHours: 6, description: '1 Day = 06 hours' },
  { id: 'ann3-2', title: 'National Curriculum Framework: Foundational Stage', domain: 'PROFESSIONAL_GROWTH', annexure: 'ANNEXURE_III', defaultHours: 6, description: '1 Day = 06 hours' },
  { id: 'ann3-3', title: 'Theory of Knowledge', domain: 'PROFESSIONAL_GROWTH', annexure: 'ANNEXURE_III', defaultHours: 6, description: '1 Day = 06 hours' },
  { id: 'ann3-4', title: 'National Education Policy 2020 (NEP 2020)', domain: 'PROFESSIONAL_GROWTH', annexure: 'ANNEXURE_III', defaultHours: 6, description: '1 Day = 06 hours' },
  { id: 'ann3-5', title: 'Happy Classrooms', domain: 'PROFESSIONAL_GROWTH', annexure: 'ANNEXURE_III', defaultHours: 6, description: '1 Day = 06 hours' },
  { id: 'ann3-6', title: 'Stress Management', domain: 'PROFESSIONAL_GROWTH', annexure: 'ANNEXURE_III', defaultHours: 6, description: '1 Day = 06 hours' },
  { id: 'ann3-7', title: 'Classroom Management', domain: 'PROFESSIONAL_GROWTH', annexure: 'ANNEXURE_III', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann3-8', title: 'Career Guidance', domain: 'PROFESSIONAL_GROWTH', annexure: 'ANNEXURE_III', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann3-9', title: 'Induction Training Programme (Guru Dakshta)', domain: 'PROFESSIONAL_GROWTH', annexure: 'ANNEXURE_III', defaultHours: 12, description: '2 Days = 12 hours' },
  { id: 'ann3-10', title: 'Leading Transformation', domain: 'PROFESSIONAL_GROWTH', annexure: 'ANNEXURE_III', defaultHours: 18, description: '3 Days = 18 hours' },
  { id: 'ann3-11', title: 'Academic oriented Assignment: Evaluation of Answer books of Class X and XII Board Examination', domain: 'PROFESSIONAL_GROWTH', annexure: 'ANNEXURE_III', defaultHours: 6, description: 'Counted 6 CPD Hrs' },
];

export const ACADEMIC_ACTIVITIES: CpdTopicCatalogItem[] = [
  { id: 'act-1', title: 'Board Examination Evaluation duty as Examiner / AHE / HE (assigned by RO)', domain: 'PROFESSIONAL_GROWTH', annexure: 'ACADEMIC_ACTIVITY', defaultHours: 6, description: 'Max 6 Hrs' },
  { id: 'act-2', title: 'SQP / Marking Scheme / Item Development / Question Bank / CBP Review / Practical Examiner', domain: 'PROFESSIONAL_GROWTH', annexure: 'ACADEMIC_ACTIVITY', defaultHours: 3, description: 'Max 3 Hrs' },
  { id: 'act-3', title: 'Research Projects / Mentoring fellow teachers / Reflective Journals / Educational Blogs / Paper Publication', domain: 'PROFESSIONAL_GROWTH', annexure: 'ACADEMIC_ACTIVITY', defaultHours: 2, description: 'Max 2 Hrs' },
  { id: 'act-4', title: 'Engaged as RP (Resource Person) for conducting CBSE CBPs', domain: 'PROFESSIONAL_GROWTH', annexure: 'ACADEMIC_ACTIVITY', defaultHours: 3, description: 'Max 3 Hrs' },
  { id: 'act-5', title: 'Viewing DD PM e-Vidya Channel CBSE 15 / Eklavya 3030 STEM Education', domain: 'PROFESSIONAL_GROWTH', annexure: 'ACADEMIC_ACTIVITY', defaultHours: 3, description: 'Max 3 Hrs' },
  { id: 'act-6', title: 'Integrating technology into teaching', domain: 'PROFESSIONAL_GROWTH', annexure: 'ACADEMIC_ACTIVITY', defaultHours: 2, description: 'Max 2 Hrs' },
  { id: 'act-7', title: 'Presentations / Participation in CBSE National-Conferences', domain: 'PROFESSIONAL_GROWTH', annexure: 'ACADEMIC_ACTIVITY', defaultHours: 3, description: 'Max 3 Hrs' },
];

export const ALL_CATALOG_TOPICS = [
  ...ANNEXURE_I_TOPICS,
  ...ANNEXURE_II_TOPICS,
  ...ANNEXURE_III_TOPICS,
  ...ACADEMIC_ACTIVITIES,
];

export const CPD_STANDARDS = {
  TOTAL_HOURS_REQUIRED: 50,
  CBSE_HOURS_REQUIRED: 25,
  SCHOOL_HOURS_REQUIRED: 25,
  DOMAINS: {
    CORE_VALUES_ETHICS: {
      name: 'Core Values and Ethics',
      totalRequired: 12,
      cbseRequired: 6,
      schoolRequired: 6,
    },
    KNOWLEDGE_PRACTICE: {
      name: 'Knowledge and Practice',
      totalRequired: 24,
      cbseRequired: 16,
      schoolRequired: 8,
    },
    PROFESSIONAL_GROWTH: {
      name: 'Professional Growth and Development',
      totalRequired: 14,
      cbseRequired: 3,
      schoolRequired: 11,
      maxAcademicActivityHours: 11,
    },
  },
};
