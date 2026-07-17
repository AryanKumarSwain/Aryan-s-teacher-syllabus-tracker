'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { QuestionEditor } from '@/features/exam-papers/components/QuestionEditor';
import { api } from '@/services/api-client';
import { useParams } from 'next/navigation';

export default function AdminEditExamPaperPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [sections, setSections] = useState<any[]>([]);

  useEffect(() => {
    if (!params.id) return;
    api.get<any>(`/exam-papers/${params.id}`).then((paper) => setSections(paper.sections || [])).catch(() => setSections([]));
  }, [params.id]);

  const handleSubmit = async (next: any[]) => {
    try {
      await api.patch(`/exam-papers/${params.id}`, { sections: next, status: 'DRAFT' });
      router.push('/admin/exam-papers');
    } catch (error) {
      console.error('Failed to update paper:', error);
    }
  };

  const handleSaveDraft = async (next: any[]) => {
    setSections(next);
    await api.patch(`/exam-papers/${params.id}`, { sections: next, status: 'DRAFT' });
  };

  return (
    <DashboardShell title="Edit Exam Paper">
      <QuestionEditor sections={sections} onSubmit={handleSubmit} onSaveDraft={handleSaveDraft} />
    </DashboardShell>
  );
}
