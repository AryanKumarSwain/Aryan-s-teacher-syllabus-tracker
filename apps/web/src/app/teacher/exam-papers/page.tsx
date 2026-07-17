'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api-client';

interface ExamPaperItem {
  id: string;
  examName: string;
  status: string;
  createdAt: string;
}

export default function TeacherExamPapersPage() {
  const [papers, setPapers] = useState<ExamPaperItem[]>([]);

  useEffect(() => {
    api.get<ExamPaperItem[]>('/exam-papers').then(setPapers).catch(() => setPapers([]));
  }, []);

  const handleSubmit = async (id: string) => {
    try {
      await api.patch(`/exam-papers/${id}`, { status: 'SUBMITTED' });
      setPapers((prev) => prev.map((p) => p.id === id ? { ...p, status: 'SUBMITTED' } : p));
    } catch (error) {
      console.error('Failed to submit paper:', error);
      alert('Failed to submit the paper. Please try again.');
    }
  };

  return (
    <DashboardShell title="Exam Papers">
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold">My papers</h2>
            <p className="text-sm text-gray-500">Draft, submit, and review your exam papers.</p>
          </div>
          <Link href="/teacher/exam-papers/create">
            <Button>Create Paper</Button>
          </Link>
        </div>
        {papers.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">No papers yet.</div>
        ) : (
          <div className="space-y-3">
            {papers.map((paper) => (
              <div key={paper.id} className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div>
                  <p className="font-semibold">{paper.examName}</p>
                  <p className="text-sm text-gray-500">{new Date(paper.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    paper.status === 'SUBMITTED' ? 'bg-green-100 text-green-700' :
                    paper.status === 'REVIEWED' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>{paper.status}</span>
                  {paper.status === 'DRAFT' && (
                    <Button onClick={() => handleSubmit(paper.id)}>Submit</Button>
                  )}
                  <Link href={`/teacher/exam-papers/${paper.id}/edit`}><Button variant="outline">Edit</Button></Link>
                  <Button variant="outline" onClick={() => api.delete(`/exam-papers/${paper.id}`).then(() => setPapers((prev) => prev.filter((item) => item.id !== paper.id)))}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
