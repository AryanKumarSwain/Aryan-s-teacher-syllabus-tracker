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
  initialData?: {
    examName?: string;
    examDate?: string;
    totalMarks?: number;
    duration?: number;
    templateType?: string;
    classId?: string;
    subjectId?: string;
  };
  isEdit?: boolean;
  paperId?: string;
}

interface ClassOption { id: string; name: string; grade?: string | null; section?: string | null; }
interface SubjectOption { id: string; name: string; }

export function PaperSetupForm({ onSubmitSuccess, initialData, isEdit = false, paperId }: PaperSetupFormProps) {
  const user = useAuthStore((s) => s.user);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);

  const defaultValues = initialData ? {
    examDate: initialData.examDate || new Date().toISOString().slice(0, 10),
    totalMarks: initialData.totalMarks || 50,
    durationHours: Math.floor((initialData.duration || 60) / 60),
    durationMinutes: (initialData.duration || 60) % 60,
    templateType: initialData.templateType || 'SINGLE',
    examName: initialData.examName || '',
    classId: initialData.classId || '',
    subjectId: initialData.subjectId || ''
  } : {
    examDate: new Date().toISOString().slice(0, 10),
    totalMarks: 50,
    durationHours: 1,
    durationMinutes: 0,
    templateType: 'SINGLE'
  };

  const form = useForm({ resolver: zodResolver(examPaperSetupSchema), defaultValues });
  const selectedClassId = form.watch('classId');
  const selectedTemplate = form.watch('templateType');

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
    const totalDuration = (Number(values.durationHours) * 60) + Number(values.durationMinutes);
    if (isEdit && paperId) {
      // Update existing paper
      await api.patch(`/exam-papers/${paperId}`, {
        examName: values.examName,
        examDate: values.examDate,
        totalMarks: Number(values.totalMarks),
        duration: totalDuration,
        templateType: values.templateType,
        classId: values.classId,
        subjectId: values.subjectId,
      });
      onSubmitSuccess(paperId, { duration: totalDuration, totalMarks: Number(values.totalMarks), templateType: values.templateType });
    } else {
      // Create new paper
      const paper = await api.post<{ id: string }>('/exam-papers', {
        ...values,
        totalMarks: Number(values.totalMarks),
        duration: totalDuration,
        schoolId: user?.schoolId,
      });
      onSubmitSuccess(paper.id, { duration: totalDuration, totalMarks: Number(values.totalMarks), templateType: values.templateType });
    }
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
          <Label>Duration</Label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input type="number" {...form.register('durationHours')} placeholder="Hours" min="0" />
            </div>
            <div className="flex items-center">hrs</div>
            <div className="flex-1">
              <Input type="number" {...form.register('durationMinutes')} placeholder="Minutes" min="0" max="59" />
            </div>
            <div className="flex items-center">min</div>
          </div>
        </div>
        <div>
          <Label>Template Design</Label>
          <select className="w-full rounded-md border border-gray-200 px-3 py-2 bg-white text-sm" {...form.register('templateType')}>
            <option value="SINGLE">Single Column Template</option>
            <option value="SPLIT">Split-Page (2-Column Layout)</option>
          </select>
          
          {/* Template Design Visual Showcase */}
          <div className="mt-4 space-y-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Template Preview</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Single Column Preview */}
              <div 
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedTemplate === 'SINGLE' 
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                onClick={() => form.setValue('templateType', 'SINGLE', { shouldDirty: true })}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-800">Single Column</span>
                  {selectedTemplate === 'SINGLE' && (
                    <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Selected</span>
                  )}
                </div>
                <div className="border border-gray-300 rounded bg-white p-3 space-y-2">
                  <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-2 bg-gray-100 rounded w-full"></div>
                  <div className="h-2 bg-gray-100 rounded w-5/6"></div>
                  <div className="h-2 bg-gray-100 rounded w-4/5"></div>
                  <div className="h-2 bg-gray-100 rounded w-full"></div>
                  <div className="h-2 bg-gray-100 rounded w-2/3"></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Traditional single-column layout with questions stacked vertically.</p>
              </div>

              {/* Split-Page Preview */}
              <div 
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedTemplate === 'SPLIT' 
                    ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                onClick={() => form.setValue('templateType', 'SPLIT', { shouldDirty: true })}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-800">Split-Page (2-Column)</span>
                  {selectedTemplate === 'SPLIT' && (
                    <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">Selected</span>
                  )}
                </div>
                <div className="border border-gray-300 rounded bg-white p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <div className="h-2 bg-gray-200 rounded w-full"></div>
                      <div className="h-2 bg-gray-100 rounded w-4/5"></div>
                      <div className="h-2 bg-gray-100 rounded w-full"></div>
                      <div className="h-2 bg-gray-100 rounded w-3/4"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 bg-gray-200 rounded w-full"></div>
                      <div className="h-2 bg-gray-100 rounded w-5/6"></div>
                      <div className="h-2 bg-gray-100 rounded w-full"></div>
                      <div className="h-2 bg-gray-100 rounded w-2/3"></div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Two-column layout for compact question arrangement.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Button type="submit">{isEdit ? 'Update' : 'Create Draft'}</Button>
    </form>
  );
}