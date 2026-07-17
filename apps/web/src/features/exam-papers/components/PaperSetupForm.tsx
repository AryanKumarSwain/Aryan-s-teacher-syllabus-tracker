'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import type { PaginatedResponse } from '@school-syllabus/types';
import { api } from '@/services/api-client';
import { examPaperSetupSchema } from '@/features/exam-papers/schemas/exam-paper.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth-store';

interface PaperSetupFormProps {
  onSubmitSuccess: (paperId: string, details: { duration: number; totalMarks: number; templateType: string }) => void;
}

interface ClassOption { id: string; name: string; grade?: string | null; section?: string | null; }
interface SubjectOption { id: string; name: string; }

export function PaperSetupForm({ onSubmitSuccess }: PaperSetupFormProps) {
  const user = useAuthStore((s) => s.user);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);

  const form = useForm({ resolver: zodResolver(examPaperSetupSchema), defaultValues: { examDate: new Date().toISOString().slice(0, 10), totalMarks: 50, duration: 60, templateType: 'SINGLE' } });
  const selectedClassId = form.watch('classId');

  useEffect(() => {
    async function loadClasses() {
      const classData = await api.get<PaginatedResponse<ClassOption>>('/syllabus/classes', {
        ...(user?.school?.currentAcademicSessionId && { academicSessionId: user.school.currentAcademicSessionId }),
      });
      setClasses(classData?.items ?? []);
    }
    loadClasses();
  }, [user?.school?.currentAcademicSessionId]);

  useEffect(() => {
    if (!selectedClassId) {
      setSubjects([]);
      form.setValue('subjectId', '', { shouldDirty: true, shouldValidate: true });
      return;
    }

    let isActive = true;
    async function loadSubjects() {
      const subjectData = await api.get<SubjectOption[]>('/syllabus/subjects', {
        classId: selectedClassId,
        ...(user?.school?.currentAcademicSessionId && { academicSessionId: user.school.currentAcademicSessionId }),
      });
      if (isActive) {
        setSubjects(subjectData ?? []);
      }
    }

    loadSubjects();
    return () => {
      isActive = false;
    };
  }, [selectedClassId, form]);

  const handleSubmit = async (values: any) => {
    const paper = await api.post<{ id: string }>('/exam-papers', {
      ...values,
      schoolId: user?.schoolId,
    });
    // Pass the duration, marks, and templateType up to the parent component
    onSubmitSuccess(paper.id, { duration: values.duration, totalMarks: values.totalMarks, templateType: values.templateType });
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>School</Label>
          <Input value={user?.school?.name ?? ''} disabled />
        </div>
        <div>
          <Label>Class</Label>
          <select className="w-full rounded-md border border-gray-200 px-3 py-2" {...form.register('classId')}>
            <option value="">Select class</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>{`${item.name}${item.grade ? ` - ${item.grade}` : ''}${item.section ? ` ${item.section}` : ''}`}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Subject</Label>
          <select className="w-full rounded-md border border-gray-200 px-3 py-2" {...form.register('subjectId')}>
            <option value="">Select subject</option>
            {subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
        <div>
          <Label>Exam Name</Label>
          <Input {...form.register('examName')} placeholder="Mid-Term" />
        </div>
        <div>
          <Label>Exam Date</Label>
          <Input type="date" {...form.register('examDate')} />
        </div>
        <div>
          <Label>Total Marks</Label>
          <Input type="number" {...form.register('totalMarks')} />
        </div>
        <div>
          <Label>Duration (minutes)</Label>
          <Input type="number" {...form.register('duration')} />
        </div>
        <div>
          <Label>Template Design</Label>
          <select className="w-full rounded-md border border-gray-200 px-3 py-2 bg-white text-sm" {...form.register('templateType')}>
            <option value="SINGLE">Single Column Template</option>
            <option value="SPLIT">Split-Page (2-Column Layout)</option>
          </select>
        </div>
      </div>
      <Button type="submit">Create Draft</Button>
    </form>
  );
}