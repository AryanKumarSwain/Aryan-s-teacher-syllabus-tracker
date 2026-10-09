'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState, useRef } from 'react';
import type { PaginatedResponse } from '@school-syllabus/types';
import { api } from '@/services/api-client';
import { examPaperSetupSchema } from '@/features/exam-papers/schemas/exam-paper.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth-store';
import { 
  Building2, 
  GraduationCap, 
  BookOpen, 
  Calendar, 
  Clock, 
  Award, 
  LayoutTemplate, 
  Columns, 
  Rows, 
  ArrowRight, 
  Sparkles,
  Check,
  Loader2,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

function formatToDateInput(date?: string | null): string {
  if (!date) return new Date().toISOString().slice(0, 10);
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
    return date.slice(0, 10);
  }
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

interface PaperSetupFormProps {
  onSubmitSuccess: (
    paperId: string, 
    details: { 
      duration: number; 
      totalMarks: number; 
      templateType: string;
      examName?: string;
      examDate?: string;
      classId?: string;
      className?: string;
      subjectId?: string;
      subjectName?: string;
    }
  ) => void;
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

const EXAM_NAME_PRESETS = ['Mid-Term Examination', 'Final Term Exam', 'Periodic Test 1', 'Unit Assessment', 'Pre-Board Exam'];
const MARKS_PRESETS = [25, 40, 50, 70, 80, 100];
const DURATION_PRESETS = [
  { label: '45 min', hours: 0, mins: 45 },
  { label: '1 hr', hours: 1, mins: 0 },
  { label: '1.5 hrs', hours: 1, mins: 30 },
  { label: '2 hrs', hours: 2, mins: 0 },
  { label: '2.5 hrs', hours: 2, mins: 30 },
  { label: '3 hrs', hours: 3, mins: 0 },
];

export function PaperSetupForm({ onSubmitSuccess, initialData, isEdit = false, paperId }: PaperSetupFormProps) {
  const user = useAuthStore((s) => s.user);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [examNameOptions, setExamNameOptions] = useState<string[]>(['Term 1', 'Term 2']);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [isLoadingExamNames, setIsLoadingExamNames] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isFirstLoadRef = useRef(true);

  const defaultValues = initialData ? {
    examDate: formatToDateInput(initialData.examDate),
    totalMarks: initialData.totalMarks || 50,
    durationHours: Math.floor((initialData.duration || 60) / 60),
    durationMinutes: (initialData.duration || 60) % 60,
    templateType: initialData.templateType || 'SINGLE',
    examName: initialData.examName || 'Term 1',
    classId: initialData.classId || '',
    subjectId: initialData.subjectId || ''
  } : {
    examDate: new Date().toISOString().slice(0, 10),
    totalMarks: 50,
    durationHours: 1,
    durationMinutes: 0,
    templateType: 'SINGLE',
    examName: 'Term 1',
    classId: '',
    subjectId: ''
  };

  const form = useForm({ resolver: zodResolver(examPaperSetupSchema), defaultValues });
  const selectedClassId = form.watch('classId');
  const selectedSubjectId = form.watch('subjectId');
  const selectedTemplate = form.watch('templateType');
  const durationHours = form.watch('durationHours');
  const durationMinutes = form.watch('durationMinutes');
  const totalMarks = form.watch('totalMarks');
  const examName = form.watch('examName');

  // Sync initialData changes when paper finishes loading from parent
  useEffect(() => {
    if (!initialData) return;
    const formattedDate = formatToDateInput(initialData.examDate);
    const hours = Math.floor((initialData.duration || 60) / 60);
    const minutes = (initialData.duration || 60) % 60;

    form.reset({
      examDate: formattedDate,
      totalMarks: initialData.totalMarks ?? 50,
      durationHours: hours,
      durationMinutes: minutes,
      templateType: initialData.templateType || 'SINGLE',
      examName: initialData.examName || '',
      classId: initialData.classId || '',
      subjectId: initialData.subjectId || '',
    });
  }, [
    initialData?.examName,
    initialData?.examDate,
    initialData?.totalMarks,
    initialData?.duration,
    initialData?.templateType,
    initialData?.classId,
    initialData?.subjectId,
    form,
  ]);

  useEffect(() => {
    let isActive = true;
    async function loadExamNames() {
      setIsLoadingExamNames(true);
      try {
        const res = await api.get<{ examNames: string[] }>('/exam-papers/exam-names');
        if (isActive && res?.examNames && Array.isArray(res.examNames) && res.examNames.length > 0) {
          setExamNameOptions(res.examNames);
          const currentVal = form.getValues('examName');
          if (!currentVal && res.examNames[0]) {
            form.setValue('examName', res.examNames[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load exam names:', err);
      } finally {
        if (isActive) setIsLoadingExamNames(false);
      }
    }
    loadExamNames();
    return () => {
      isActive = false;
    };
  }, [form]);

  useEffect(() => {
    let isActive = true;
    async function loadClasses() {
      setIsLoadingClasses(true);
      try {
        const classData = await api.get<PaginatedResponse<ClassOption>>('/syllabus/classes', {
          ...(user?.school?.currentAcademicSessionId && { academicSessionId: user.school.currentAcademicSessionId }),
        });
        if (isActive) {
          const items = classData?.items ?? [];
          setClasses(items);
          if (initialData?.classId && items.some(c => c.id === initialData.classId)) {
            form.setValue('classId', initialData.classId);
          }
        }
      } catch (err) {
        console.error('Failed to load classes:', err);
      } finally {
        if (isActive) setIsLoadingClasses(false);
      }
    }
    loadClasses();
    return () => {
      isActive = false;
    };
  }, [user?.school?.currentAcademicSessionId, initialData?.classId, form]);

  useEffect(() => {
    if (!selectedClassId) {
      setSubjects([]);
      if (!isFirstLoadRef.current) {
        form.setValue('subjectId', '', { shouldDirty: true, shouldValidate: true });
      }
      return;
    }

    let isActive = true;
    async function loadSubjects() {
      setIsLoadingSubjects(true);
      try {
        const subjectData = await api.get<SubjectOption[]>('/syllabus/subjects', {
          classId: selectedClassId,
          ...(user?.school?.currentAcademicSessionId && { academicSessionId: user.school.currentAcademicSessionId }),
        });
        if (!isActive) return;
        const items = subjectData ?? [];
        setSubjects(items);

        // Retain initialData.subjectId if present and valid, or keep current form value
        const targetSubjectId = (isFirstLoadRef.current ? initialData?.subjectId : null) || form.getValues('subjectId');
        if (targetSubjectId && items.some((s) => s.id === targetSubjectId)) {
          form.setValue('subjectId', targetSubjectId, { shouldValidate: true });
        } else if (items.length === 1 && items[0]) {
          form.setValue('subjectId', items[0].id, { shouldValidate: true });
        } else if (!isFirstLoadRef.current) {
          form.setValue('subjectId', '', { shouldValidate: true });
        }
        isFirstLoadRef.current = false;
      } catch (err) {
        console.error('Failed to load subjects:', err);
      } finally {
        if (isActive) setIsLoadingSubjects(false);
      }
    }

    loadSubjects();
    return () => {
      isActive = false;
    };
  }, [selectedClassId, form, user?.school?.currentAcademicSessionId, initialData?.subjectId]);

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    try {
      const totalDuration = (Number(values.durationHours) * 60) + Number(values.durationMinutes);
      const selectedClass = classes.find((c) => c.id === values.classId);
      const selectedSubject = subjects.find((s) => s.id === values.subjectId);

      const detailPayload = {
        duration: totalDuration,
        totalMarks: Number(values.totalMarks),
        templateType: values.templateType,
        examName: values.examName,
        examDate: values.examDate,
        classId: values.classId,
        className: selectedClass ? `${selectedClass.name}${selectedClass.grade ? ` - ${selectedClass.grade}` : ''}${selectedClass.section ? ` ${selectedClass.section}` : ''}` : undefined,
        subjectId: values.subjectId,
        subjectName: selectedSubject?.name,
      };

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
        onSubmitSuccess(paperId, detailPayload);
      } else {
        // Create new paper
        const paper = await api.post<{ id: string }>('/exam-papers', {
          ...values,
          totalMarks: Number(values.totalMarks),
          duration: totalDuration,
          schoolId: user?.schoolId,
        });
        onSubmitSuccess(paper.id, detailPayload);
      }
    } catch (error) {
      console.error('Failed to save paper setup:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculatedTotalMinutes = (Number(durationHours || 0) * 60) + Number(durationMinutes || 0);

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* 1. Academic Scope Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200/50">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Academic Context</h3>
            <p className="text-xs text-slate-500">Assign school, grade class and subject syllabus</p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3 mt-5">
          {/* School (Read-only) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
              School / Institution
            </Label>
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm font-medium text-slate-700 flex items-center justify-between">
              <span className="truncate">{user?.school?.name ?? 'Assigned School'}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active
              </span>
            </div>
          </div>

          {/* Class Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5 text-blue-500" />
              Target Class <span className="text-red-500">*</span>
            </Label>
            <select 
              className={cn(
                "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm font-medium transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100",
                form.formState.errors.classId ? "border-red-400 bg-red-50/30" : "border-slate-200 hover:border-slate-300"
              )}
              {...form.register('classId')}
              disabled={isLoadingClasses}
            >
              <option value="">{isLoadingClasses ? 'Loading classes...' : 'Select Class / Division'}</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {`${item.name}${item.grade ? ` - ${item.grade}` : ''}${item.section ? ` (${item.section})` : ''}`}
                </option>
              ))}
            </select>
            {form.formState.errors.classId && (
              <p className="text-xs text-red-500 font-medium">{form.formState.errors.classId.message as string}</p>
            )}
          </div>

          {/* Subject Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-indigo-500" />
              Subject <span className="text-red-500">*</span>
            </Label>
            <select 
              className={cn(
                "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm font-medium transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100",
                form.formState.errors.subjectId ? "border-red-400 bg-red-50/30" : "border-slate-200 hover:border-slate-300",
                !selectedClassId && "opacity-60 cursor-not-allowed bg-slate-50"
              )}
              {...form.register('subjectId')}
              disabled={!selectedClassId || isLoadingSubjects}
            >
              <option value="">
                {!selectedClassId 
                  ? '← Choose a class first' 
                  : isLoadingSubjects 
                  ? 'Loading subjects...' 
                  : 'Select Subject'}
              </option>
              {subjects.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            {form.formState.errors.subjectId && (
              <p className="text-xs text-red-500 font-medium">{form.formState.errors.subjectId.message as string}</p>
            )}
          </div>
        </div>
      </div>

      {/* 2. Exam Specifications Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/50">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Exam Details & Schedule</h3>
            <p className="text-xs text-slate-500">Exam title, testing date and total score benchmark</p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3 mt-5">
          {/* Exam Name Select Dropdown */}
          <div className="space-y-1.5 md:col-span-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-indigo-500" />
                Exam Name <span className="text-red-500">*</span>
              </Label>
              <span className="text-[11px] text-slate-400">School Admin Defined</span>
            </div>
            <select
              {...form.register('examName')}
              className={cn(
                "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm font-medium transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100",
                form.formState.errors.examName ? "border-red-400 bg-red-50/30" : "border-slate-200 hover:border-slate-300"
              )}
              disabled={isLoadingExamNames}
            >
              <option value="">{isLoadingExamNames ? 'Loading exam names...' : 'Select Exam Name'}</option>
              {Array.from(new Set([
                ...(initialData?.examName ? [initialData.examName] : []),
                ...examNameOptions
              ])).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            {form.formState.errors.examName && (
              <p className="text-xs text-red-500 font-medium">{form.formState.errors.examName.message as string}</p>
            )}

            {/* Note: If you can't find your exam, please contact school admin */}
            <p className="text-[11px] text-amber-700 bg-amber-50/80 border border-amber-200/60 rounded-lg px-2.5 py-1.5 mt-1.5 flex items-center gap-1.5 font-medium">
              <Info className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>Note: If you can't find your exam, please contact the school admin.</span>
            </p>
          </div>

          {/* Exam Date */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Exam Date <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              {...form.register('examDate')}
              min={isEdit ? undefined : new Date().toISOString().slice(0, 10)}
              className={cn(
                "rounded-xl border px-3.5 py-2.5 text-sm font-medium",
                form.formState.errors.examDate ? "border-red-400" : "border-slate-200"
              )}
            />
            {form.formState.errors.examDate && (
              <p className="text-xs text-red-500 font-medium">
                {form.formState.errors.examDate.message as string}
              </p>
            )}
          </div>
        </div>

        {/* Total Marks & Presets */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-amber-500" />
                Target Total Marks <span className="text-red-500">*</span>
              </Label>
              <p className="text-xs text-slate-500 mt-0.5">Grand total score for the question paper</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="w-28">
                <Input 
                  type="number" 
                  min="1"
                  max="500"
                  {...form.register('totalMarks')} 
                  className="rounded-xl border border-slate-200 text-center font-bold text-base text-slate-800"
                />
              </div>
              <span className="text-xs font-bold text-slate-500">Marks</span>

              {/* Quick Marks Presets */}
              <div className="flex items-center gap-1.5 ml-2 pl-3 border-l border-slate-200">
                {MARKS_PRESETS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => form.setValue('totalMarks', m, { shouldValidate: true, shouldDirty: true })}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all",
                      Number(totalMarks) === m
                        ? "bg-amber-50 border-amber-300 text-amber-800 ring-1 ring-amber-400"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {m}M
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Duration & Time Management Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/50">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Exam Duration & Timing</h3>
              <p className="text-xs text-slate-500">Time allocated to students for this examination</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-emerald-50/70 border border-emerald-200 px-3.5 py-1.5 text-xs font-bold text-emerald-800">
            <Clock className="h-3.5 w-3.5 text-emerald-600" />
            <span>Total: {Math.floor(calculatedTotalMinutes / 60)}h {calculatedTotalMinutes % 60}m ({calculatedTotalMinutes} mins)</span>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {/* Quick Duration Preset Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 mr-1">Quick Select:</span>
            {DURATION_PRESETS.map((preset) => {
              const isSelected = Number(durationHours) === preset.hours && Number(durationMinutes) === preset.mins;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    form.setValue('durationHours', preset.hours, { shouldDirty: true });
                    form.setValue('durationMinutes', preset.mins, { shouldDirty: true });
                  }}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-xl border font-semibold transition-all",
                    isSelected
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-2xs"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300"
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Custom Hours & Minutes Inputs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div>
              <Label className="text-xs font-semibold text-slate-600">Hours</Label>
              <div className="mt-1 flex items-center rounded-xl border border-slate-200 bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                <input 
                  type="number" 
                  min="0"
                  max="12"
                  {...form.register('durationHours')} 
                  className="w-full py-2 text-sm font-bold text-slate-800 outline-none"
                  placeholder="0"
                />
                <span className="text-xs font-semibold text-slate-400">hrs</span>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-600">Minutes</Label>
              <div className="mt-1 flex items-center rounded-xl border border-slate-200 bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                <input 
                  type="number" 
                  min="0"
                  max="59"
                  {...form.register('durationMinutes')} 
                  className="w-full py-2 text-sm font-bold text-slate-800 outline-none"
                  placeholder="0"
                />
                <span className="text-xs font-semibold text-slate-400">min</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Document Layout & Template Selection Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-200/50">
            <LayoutTemplate className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Paper Format & Layout Style</h3>
            <p className="text-xs text-slate-500">Select the layout structure for printing and export</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          {/* Single Column Template Card */}
          <div 
            onClick={() => form.setValue('templateType', 'SINGLE', { shouldDirty: true })}
            className={cn(
              "group relative rounded-2xl border-2 p-5 cursor-pointer transition-all",
              selectedTemplate === 'SINGLE'
                ? "border-blue-600 bg-blue-50/40 shadow-sm ring-4 ring-blue-500/10"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Rows className={cn("h-4 w-4", selectedTemplate === 'SINGLE' ? "text-blue-600" : "text-slate-400")} />
                <span className="font-bold text-sm text-slate-900">Single Column Template</span>
              </div>
              {selectedTemplate === 'SINGLE' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-xs">
                  <Check className="h-3 w-3 stroke-[3]" />
                  Active
                </span>
              ) : (
                <span className="text-xs text-slate-400 font-medium">Standard</span>
              )}
            </div>

            {/* Visual Schematic */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2">
              <div className="h-2 w-3/5 rounded bg-slate-300/80 mb-3" />
              <div className="h-2 w-full rounded bg-slate-200" />
              <div className="h-2 w-5/6 rounded bg-slate-100" />
              <div className="h-2 w-4/6 rounded bg-slate-100" />
              <div className="h-2 w-full rounded bg-slate-200 mt-3" />
              <div className="h-2 w-3/4 rounded bg-slate-100" />
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
              <p className="text-slate-500 font-medium">Full-width sequential questions with standard margins.</p>
              <span className="font-semibold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded text-[10px]">Recommended</span>
            </div>
          </div>

          {/* Split-Page (2-Column) Card */}
          <div 
            onClick={() => form.setValue('templateType', 'SPLIT', { shouldDirty: true })}
            className={cn(
              "group relative rounded-2xl border-2 p-5 cursor-pointer transition-all",
              selectedTemplate === 'SPLIT'
                ? "border-purple-600 bg-purple-50/40 shadow-sm ring-4 ring-purple-500/10"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Columns className={cn("h-4 w-4", selectedTemplate === 'SPLIT' ? "text-purple-600" : "text-slate-400")} />
                <span className="font-bold text-sm text-slate-900">Split-Page (2-Column Layout)</span>
              </div>
              {selectedTemplate === 'SPLIT' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-xs">
                  <Check className="h-3 w-3 stroke-[3]" />
                  Active
                </span>
              ) : (
                <span className="text-xs text-slate-400 font-medium">Eco Print</span>
              )}
            </div>

            {/* Visual Schematic */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="grid grid-cols-2 gap-3 divide-x divide-slate-100">
                <div className="space-y-2 pr-1">
                  <div className="h-2 w-4/5 rounded bg-slate-300/80 mb-2" />
                  <div className="h-2 w-full rounded bg-slate-200" />
                  <div className="h-2 w-3/4 rounded bg-slate-100" />
                  <div className="h-2 w-5/6 rounded bg-slate-100" />
                </div>
                <div className="space-y-2 pl-3">
                  <div className="h-2 w-full rounded bg-slate-200" />
                  <div className="h-2 w-4/5 rounded bg-slate-100" />
                  <div className="h-2 w-full rounded bg-slate-200" />
                  <div className="h-2 w-2/3 rounded bg-slate-100" />
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
              <p className="text-slate-500 font-medium">Compact dual column layout, ideal for saving paper sheets.</p>
              <span className="font-semibold text-purple-700 bg-purple-100/60 px-2 py-0.5 rounded text-[10px]">Paper Saver</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Submit Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="text-xs text-slate-500">
          Step 1 of 5 • Proceeding will create or update the exam paper draft.
        </div>
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all hover:shadow"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving details...</span>
            </>
          ) : (
            <>
              <span>{isEdit ? 'Save & Continue to Sections' : 'Create Draft & Continue'}</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}