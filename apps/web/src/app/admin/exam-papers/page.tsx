'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, FileText, Download, CheckCircle2, Eye, Edit3, Upload, Image as ImageIcon, Trash2, CloudUpload, ExternalLink, RefreshCw, AlertTriangle, HardDrive } from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/services/api-client';
import { toast } from 'sonner';
import { env } from '@/config/env';
import { Badge } from '@/components/ui/badge';
import { useSchool } from '@/features/syllabus/hooks/use-school';
import { useAcademicSessions } from '@/features/syllabus/hooks/use-academic-sessions';
import { cn } from '@/lib/utils';

interface GoogleDriveStatusData {
  connected: boolean;
  email?: string;
  storage?: {
    limit?: number;
    usage: number;
    usageInDrive?: number;
    percent?: number;
    formattedUsage: string;
    formattedLimit?: string;
    isNearFull: boolean;
    isCritical: boolean;
  } | null;
}

function GoogleDriveIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 87.3 78" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.9 2.5 3.2 3.3l12.3-21.3H6.6c0 1.5.4 3 1.2 4.35l-1.2 7z" fill="#0066DA" />
      <path d="M43.65 25L31.35 3.7c-1.3.8-2.4 1.9-3.2 3.3L1.2 53.5c-.8 1.4-1.2 2.9-1.2 4.4h25.95L43.65 25z" fill="#00AC47" />
      <path d="M73.55 76.8c1.3-.8 2.4-1.9 3.2-3.3l1.6-2.8 8.1-14c.8-1.4 1.2-2.9 1.2-4.4H61.7l5.25 10.5 6.6 14z" fill="#EA4335" />
      <path d="M43.65 25L56 3.7C54.7 2.9 53.2 2.5 51.7 2.5H35.6c-1.5 0-3 .4-4.3 1.2L43.65 25z" fill="#00832D" />
      <path d="M59.8 55.5H27.5L15.2 76.8c1.3.8 2.8 1.2 4.3 1.2h48.3c1.5 0 3-.4 4.3-1.2L59.8 55.5z" fill="#2684FC" />
      <path d="M73.4 26.5l-12.7-22c-1.3-.8-2.8-1.2-4.3-1.2L43.65 25l18.05 31.2h25.6c0-1.5-.4-3-1.2-4.4l-12.7-25.3z" fill="#FFBA00" />
    </svg>
  );
}

interface AdminPaperItem {
  id: string;
  examName: string;
  status: string;
  teacher: { user: { name: string } };
  class: { name: string };
  subject: { name: string };
  school?: { 
    name: string;
    examPaperTemplates?: Array<{ logoUrl?: string }>;
  };
  totalMarks?: number;
  duration?: number;
  examDate?: string;
  instructions?: string;
  styleFontFamily?: string;
  styleFontSize?: string;
  styleColor?: string;
  templateType?: string;
  pdfUrl?: string;
  googleDriveFileId?: string;
  googleDriveWebViewLink?: string;
  sections?: unknown[];
}

export default function AdminExamPapersPage() {
  const queryClient = useQueryClient();
  const { school } = useSchool();
  const { sessions } = useAcademicSessions();
  const currentSession = sessions?.find((s) => s.id === school?.currentAcademicSessionId);
  const [expandedPaperId, setExpandedPaperId] = useState<string | null>(null);
  const [rollNumber, setRollNumber] = useState('');
  const [studentCount, setStudentCount] = useState(30);
  const [downloadingType, setDownloadingType] = useState<string | null>(null);
  const [showTeacherName, setShowTeacherName] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('admin_show_teacher_name_paper');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const { data: template } = useQuery({
    queryKey: ['exam-paper-template'],
    queryFn: () => api.get<{ id?: string; logoUrl?: string | null }>('/exam-papers/template'),
    staleTime: 60000,
  });

  const [connectingDrive, setConnectingDrive] = useState(false);
  const [disconnectingDrive, setDisconnectingDrive] = useState(false);

  const { data: driveStatus, refetch: refetchDriveStatus, isLoading: loadingDriveStatus } = useQuery({
    queryKey: ['google-drive-status'],
    queryFn: () => api.get<GoogleDriveStatusData>('/google-drive/status'),
    staleTime: 30000,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const driveConnected = url.searchParams.get('drive_connected');
    const driveError = url.searchParams.get('drive_error');

    if (driveConnected === 'true') {
      toast.success('Google Drive successfully connected! Auto-folder organization is active.');
      refetchDriveStatus();
      queryClient.invalidateQueries({ queryKey: ['admin-exam-papers'] });
      url.searchParams.delete('drive_connected');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
    } else if (driveError) {
      toast.error(`Google Drive connection error: ${decodeURIComponent(driveError)}`);
      url.searchParams.delete('drive_error');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
    }
  }, [queryClient, refetchDriveStatus]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, SVG, WebP)');
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch(`${env.apiUrl}/exam-papers/template/upload-logo`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();
      if (response.ok && data.success) {
        queryClient.invalidateQueries({ queryKey: ['exam-paper-template'] });
        queryClient.invalidateQueries({ queryKey: ['admin-exam-papers'] });
        toast.success('School logo updated and synced');
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Logo upload failed');
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    setUploadingLogo(true);
    try {
      await api.post('/exam-papers/template', {
        headerHtml: '',
        logoUrl: null,
      });
      queryClient.invalidateQueries({ queryKey: ['exam-paper-template'] });
      queryClient.invalidateQueries({ queryKey: ['admin-exam-papers'] });
      toast.success('School logo removed');
    } catch (error) {
      toast.error('Failed to remove logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleToggleShowTeacherName = (checked: boolean) => {
    setShowTeacherName(checked);
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_show_teacher_name_paper', String(checked));
    }
  };

  const { data: papers = [], isLoading } = useQuery({
    queryKey: ['admin-exam-papers'],
    queryFn: () => api.get<AdminPaperItem[]>('/exam-papers'),
    staleTime: 30000,
  });

  const markReviewedMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/exam-papers/${id}`, { status: 'REVIEWED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-exam-papers'] });
      toast.success('Paper marked as reviewed');
    },
    onError: () => toast.error('Failed to mark paper as reviewed. Please try again.'),
  });

  const handleDownloadSingleStudent = async (paperId: string) => {
    if (!rollNumber.trim()) {
      toast.error('Please enter a roll number');
      return;
    }
    setDownloadingType(`single-${paperId}`);
    try {
      const [paper, { generateExamPaperPdf }] = await Promise.all([
        api.get<AdminPaperItem>(`/exam-papers/${paperId}`),
        import('@/features/exam-papers/utils/pdf-generator'),
      ]);
      
      const pdfData = {
        schoolName: paper.school?.name || '',
        examName: paper.examName || '',
        className: paper.class?.name || '',
        subjectName: paper.subject?.name || '',
        examDate: paper.examDate || '',
        totalMarks: paper.totalMarks || 0,
        duration: paper.duration || 0,
        instructions: paper.instructions || '',
        templateType: (paper.templateType as 'SINGLE' | 'SPLIT') || 'SINGLE',
        styleFontFamily: paper.styleFontFamily || 'Times New Roman',
        styleFontSize: paper.styleFontSize || '11pt',
        styleColor: paper.styleColor || '#000000',
        logoUrl: template?.logoUrl || paper.school?.examPaperTemplates?.[0]?.logoUrl || '',
        teacherName: paper.teacher?.user?.name || '',
        showTeacherName: showTeacherName,
        sections: paper.sections || [],
      };
      
      const blob = await generateExamPaperPdf(pdfData as any, rollNumber);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${paper.examName.replace(/\s+/g, '_')}_${rollNumber}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Exam paper PDF downloaded');
    } catch (error) {
      console.error('Failed to download PDF:', error);
      toast.error('Failed to download PDF. Please try again.');
    } finally {
      setDownloadingType(null);
    }
  };

  const handleDownloadBulk = async (paperId: string) => {
    setDownloadingType(`bulk-${paperId}`);
    try {
      const [paper, { generateBulkExamPapersZip }] = await Promise.all([
        api.get<AdminPaperItem>(`/exam-papers/${paperId}`),
        import('@/features/exam-papers/utils/pdf-generator'),
      ]);
      
      const pdfData = {
        schoolName: paper.school?.name || '',
        examName: paper.examName || '',
        className: paper.class?.name || '',
        subjectName: paper.subject?.name || '',
        examDate: paper.examDate || '',
        totalMarks: paper.totalMarks || 0,
        duration: paper.duration || 0,
        instructions: paper.instructions || '',
        templateType: (paper.templateType as 'SINGLE' | 'SPLIT') || 'SINGLE',
        styleFontFamily: paper.styleFontFamily || 'Times New Roman',
        styleFontSize: paper.styleFontSize || '11pt',
        styleColor: paper.styleColor || '#000000',
        logoUrl: template?.logoUrl || paper.school?.examPaperTemplates?.[0]?.logoUrl || '',
        teacherName: paper.teacher?.user?.name || '',
        showTeacherName: showTeacherName,
        sections: paper.sections || [],
      };

      const zipBlob = await generateBulkExamPapersZip(pdfData as any, studentCount);
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${paper.examName.replace(/\s+/g, '_')}_Bulk_Roll_Sheets.zip`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Bulk exam papers ZIP downloaded');
    } catch (error) {
      console.error('Failed to download bulk ZIP:', error);
      toast.error('Failed to download bulk ZIP. Please try again.');
    } finally {
      setDownloadingType(null);
    }
  };

  const handleDownloadBlank = async (paperId: string) => {
    setDownloadingType(`blank-${paperId}`);
    try {
      const [paper, { generateExamPaperPdf }] = await Promise.all([
        api.get<AdminPaperItem>(`/exam-papers/${paperId}`),
        import('@/features/exam-papers/utils/pdf-generator'),
      ]);
      
      const pdfData = {
        schoolName: paper.school?.name || '',
        examName: paper.examName || '',
        className: paper.class?.name || '',
        subjectName: paper.subject?.name || '',
        examDate: paper.examDate || '',
        totalMarks: paper.totalMarks || 0,
        duration: paper.duration || 0,
        instructions: paper.instructions || '',
        templateType: (paper.templateType as 'SINGLE' | 'SPLIT') || 'SINGLE',
        styleFontFamily: paper.styleFontFamily || 'Times New Roman',
        styleFontSize: paper.styleFontSize || '11pt',
        styleColor: paper.styleColor || '#000000',
        logoUrl: template?.logoUrl || paper.school?.examPaperTemplates?.[0]?.logoUrl || '',
        teacherName: paper.teacher?.user?.name || '',
        showTeacherName: showTeacherName,
        sections: paper.sections || [],
      };
      
      const blob = await generateExamPaperPdf(pdfData as any, '');
      const url = window.URL.createObjectURL(blob);
      const teacherSuffix = paper.teacher?.user?.name ? `_${paper.teacher.user.name.trim().replace(/\s+/g, '_')}` : '';
      link.download = `${paper.examName.trim().replace(/\s+/g, '_')}${teacherSuffix}_Paper.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Blank exam paper PDF downloaded');
    } catch (error) {
      console.error('Failed to download PDF:', error);
      toast.error('Failed to download PDF. Please try again.');
    } finally {
      setDownloadingType(null);
    }
  };

  const handleConnectDrive = async () => {
    try {
      setConnectingDrive(true);
      const res = await api.get<{ authUrl: string }>(
        `/google-drive/auth-url?returnUrl=${encodeURIComponent(window.location.origin + '/admin/exam-papers')}`
      );
      if (res?.authUrl) {
        window.location.href = res.authUrl;
      } else {
        toast.error('Failed to get Google authorization URL');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to start Google Drive connection');
    } finally {
      setConnectingDrive(false);
    }
  };

  const handleDisconnectDrive = async () => {
    if (!confirm('Are you sure you want to disconnect Google Drive? Exam papers will no longer auto-sync to Drive.')) {
      return;
    }
    try {
      setDisconnectingDrive(true);
      await api.post('/google-drive/disconnect');
      await refetchDriveStatus();
      toast.success('Google Drive disconnected');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to disconnect Google Drive');
    } finally {
      setDisconnectingDrive(false);
    }
  };

  const handleUploadToDrive = async (paperId: string) => {
    if (!driveStatus?.connected) {
      toast.error('Google Drive is not connected yet. Click "Connect Google Drive" above to authorize your account.', {
        action: {
          label: 'Connect Now',
          onClick: handleConnectDrive,
        },
      });
      return;
    }

    setDownloadingType(`drive-${paperId}`);
    try {
      const [paper, { generateExamPaperPdf }] = await Promise.all([
        api.get<AdminPaperItem>(`/exam-papers/${paperId}`),
        import('@/features/exam-papers/utils/pdf-generator'),
      ]);

      const pdfData = {
        schoolName: paper.school?.name || '',
        examName: paper.examName || '',
        className: paper.class?.name || '',
        subjectName: paper.subject?.name || '',
        examDate: paper.examDate || '',
        totalMarks: paper.totalMarks || 0,
        duration: paper.duration || 0,
        instructions: paper.instructions || '',
        templateType: (paper.templateType as 'SINGLE' | 'SPLIT') || 'SINGLE',
        styleFontFamily: paper.styleFontFamily || 'Times New Roman',
        styleFontSize: paper.styleFontSize || '11pt',
        styleColor: paper.styleColor || '#000000',
        logoUrl: template?.logoUrl || paper.school?.examPaperTemplates?.[0]?.logoUrl || '',
        teacherName: paper.teacher?.user?.name || '',
        showTeacherName: showTeacherName,
        sections: paper.sections || [],
      };

      const teacherSuffix = paper.teacher?.user?.name ? `_${paper.teacher.user.name.trim().replace(/\s+/g, '_')}` : '';
      const safeExamName = `${paper.examName.trim().replace(/\s+/g, '_')}${teacherSuffix}_Paper.pdf`;

      const formData = new FormData();
      formData.append('pdf', blob, safeExamName);
      formData.append('fileName', safeExamName);

      const result = await api.postFormData<any>(`/google-drive/upload-paper/${paper.id}`, formData);

      queryClient.invalidateQueries({ queryKey: ['admin-exam-papers'] });

      toast.success(
        `Uploaded to Google Drive! Path: ${result.folderPath || `Exam Papers / ${paper.class.name} / ${paper.subject.name}`}`,
        {
          action: result.webViewLink
            ? {
                label: 'Open in Drive',
                onClick: () => window.open(result.webViewLink, '_blank'),
              }
            : undefined,
          duration: 7000,
        }
      );
    } catch (error: any) {
      console.error('Failed to upload paper to Google Drive:', error);
      toast.error(error?.message || 'Failed to upload paper to Google Drive. Please try again.');
    } finally {
      setDownloadingType(null);
    }
  };

  const toggleExpand = (paperId: string) => {
    setExpandedPaperId(expandedPaperId === paperId ? null : paperId);
    setRollNumber('');
  };

  const reviewedCount = papers.filter((p) => p.status === 'REVIEWED').length;
  const pendingCount = papers.filter((p) => p.status === 'SUBMITTED').length;
  const syncedDriveCount = papers.filter((p) => !!p.googleDriveWebViewLink).length;

  return (
    <DashboardShell title="Exam Papers">
      <div className="animate-in fade-in space-y-4 pb-8 duration-300">
        {/* Executive Header Banner */}
        <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-white via-slate-50/70 to-emerald-50/30 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm ring-4 ring-emerald-500/10">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                    Question Papers & Archives
                  </h1>
                  {currentSession ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-200 bg-emerald-50 text-[11px] font-semibold text-emerald-700 shadow-2xs"
                    >
                      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live: {currentSession.name}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-[11px] text-slate-600">
                      Active Term
                    </Badge>
                  )}
                  {driveStatus?.connected && (
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[11px] text-emerald-700 font-semibold shadow-2xs">
                      Drive Sync Active
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Audit, approve, format, and generate bulk PDF roll sheets with automated cloud backups.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer select-none items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-2xs transition-all hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={showTeacherName}
                  onChange={(e) => handleToggleShowTeacherName(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <div className="text-left">
                  <span className="block text-xs font-semibold text-slate-800">Faculty Signature</span>
                  <span className="text-[10px] text-slate-500">{showTeacherName ? 'Visible in PDFs' : 'Hidden from PDFs'}</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* 4-KPI Metric Strip */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/60 p-3.5 shadow-xs transition-all hover:border-slate-300 hover:shadow-sm">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-blue-700 uppercase">
                Submitted
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <FileText className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {isLoading ? '-' : papers.length}
              </div>
              <p className="text-[11px] text-slate-500">Total papers drafted</p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/60 p-3.5 shadow-xs transition-all hover:border-slate-300 hover:shadow-sm">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-emerald-700 uppercase">
                Reviewed
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {isLoading ? '-' : reviewedCount}
              </div>
              <p className="text-[11px] text-slate-500">Approved for printing</p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/60 p-3.5 shadow-xs transition-all hover:border-slate-300 hover:shadow-sm">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-amber-700 uppercase">
                Pending
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Edit3 className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {isLoading ? '-' : pendingCount}
              </div>
              <p className="text-[11px] text-slate-500">Awaiting admin review</p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/60 p-3.5 shadow-xs transition-all hover:border-slate-300 hover:shadow-sm">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 to-cyan-500" />
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-teal-700 uppercase">
                Drive Synced
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                <CloudUpload className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {isLoading ? '-' : syncedDriveCount}
              </div>
              <p className="text-[11px] text-slate-500">Stored in Google Drive</p>
            </div>
          </div>
        </div>

        {/* Integration Hub: School Logo & Google Drive */}
        <div className="grid gap-3.5 lg:grid-cols-2">

          {/* School Logo Section (Synced with Settings & Navbar) */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs hover:border-slate-300 transition-all">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-11 w-11 rounded-xl border border-slate-200/80 bg-slate-50 p-1 flex items-center justify-center shadow-2xs overflow-hidden shrink-0">
                    {template?.logoUrl ? (
                      <img
                        src={template.logoUrl}
                        alt="School Logo"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-slate-900 truncate">School Header Logo</h3>
                      {template?.logoUrl ? (
                        <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
                          Not Set
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      Prints on exam paper headers, watermarks &amp; navbar
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploadingLogo}
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs h-8 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 gap-1.5 shadow-2xs font-medium"
                  >
                    {uploadingLogo ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5 text-slate-500" />
                    )}
                    {template?.logoUrl ? 'Change' : 'Upload'}
                  </Button>
                  {template?.logoUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={uploadingLogo}
                      onClick={handleRemoveLogo}
                      className="text-xs h-8 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5"
                      title="Remove Logo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                Synced with PDF Generator &amp; Settings
              </span>
              <span className="text-[10px] text-slate-400 font-medium">PNG / JPG / WebP</span>
            </div>
          </div>

          {/* Google Drive Integration Banner */}
          <div className={cn(
            "flex flex-col justify-between rounded-2xl border p-4 shadow-xs transition-all",
            driveStatus?.storage?.isCritical
              ? "border-red-300 bg-gradient-to-br from-red-50/40 via-white to-white"
              : driveStatus?.storage?.isNearFull
              ? "border-amber-300 bg-gradient-to-br from-amber-50/40 via-white to-white"
              : "border-emerald-200/80 bg-gradient-to-br from-emerald-50/30 via-white to-white"
          )}>
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "h-11 w-11 rounded-xl border bg-white p-2 flex items-center justify-center shadow-2xs shrink-0",
                    driveStatus?.storage?.isCritical
                      ? "border-red-200"
                      : driveStatus?.storage?.isNearFull
                      ? "border-amber-200"
                      : "border-emerald-200"
                  )}>
                    <GoogleDriveIcon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-slate-900 truncate">Google Drive Auto-Sync</h3>
                      {loadingDriveStatus ? (
                        <span className="text-[10px] bg-slate-100 text-slate-500 font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Loader2 className="h-2.5 w-2.5 animate-spin" /> Checking
                        </span>
                      ) : driveStatus?.connected ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span> Connected
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
                          Not Connected
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {driveStatus?.connected
                        ? `Connected: ${driveStatus.email || 'School Admin'}`
                        : 'Auto-syncs exam papers into class & subject folders'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {driveStatus?.connected ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={connectingDrive || disconnectingDrive}
                        onClick={handleConnectDrive}
                        className="text-xs h-8 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-50 border-slate-200 gap-1.5 shadow-2xs font-medium"
                        title="Switch to another Google account"
                      >
                        {connectingDrive ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 text-slate-500" />}
                        Switch Account
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={disconnectingDrive}
                        onClick={handleDisconnectDrive}
                        className="text-xs h-8 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5"
                        title="Disconnect Drive"
                      >
                        {disconnectingDrive ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Disconnect'}
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      disabled={connectingDrive || loadingDriveStatus}
                      onClick={handleConnectDrive}
                      className="text-xs h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-2xs font-medium"
                    >
                      {connectingDrive ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <GoogleDriveIcon className="h-3.5 w-3.5" />
                      )}
                      Connect Drive
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100">
              {driveStatus?.connected && driveStatus.storage ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <HardDrive className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <span className="font-medium text-[11px]">Storage:</span>
                      <span className="font-bold text-[11px] text-slate-900">
                        {driveStatus.storage.formattedUsage}
                        {driveStatus.storage.formattedLimit ? ` / ${driveStatus.storage.formattedLimit}` : ''}
                      </span>
                      {driveStatus.storage.percent !== undefined && (
                        <span className="text-[10px] text-slate-500 font-normal">
                          ({driveStatus.storage.percent}% used)
                        </span>
                      )}
                    </div>
                    {driveStatus.storage.percent !== undefined && (
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        driveStatus.storage.isCritical
                          ? "bg-red-100 text-red-700"
                          : driveStatus.storage.isNearFull
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      )}>
                        {Math.max(0, 100 - driveStatus.storage.percent)}% free
                      </span>
                    )}
                  </div>

                  {driveStatus.storage.percent !== undefined && (
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200/60">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          driveStatus.storage.isCritical
                            ? "bg-red-500 animate-pulse"
                            : driveStatus.storage.isNearFull
                            ? "bg-amber-500"
                            : "bg-gradient-to-r from-emerald-500 to-teal-500"
                        )}
                        style={{ width: `${Math.min(100, Math.max(3, driveStatus.storage.percent))}%` }}
                      />
                    </div>
                  )}

                  {driveStatus.storage.isNearFull && (
                    <div className={cn(
                      "flex items-center justify-between gap-2 p-1.5 px-2 rounded-lg border text-[11px] mt-1.5 animate-fadeIn",
                      driveStatus.storage.isCritical
                        ? "bg-red-50 border-red-200 text-red-900"
                        : "bg-amber-50 border-amber-200 text-amber-900"
                    )}>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <AlertTriangle className={cn(
                          "h-3.5 w-3.5 shrink-0",
                          driveStatus.storage.isCritical ? "text-red-600" : "text-amber-600"
                        )} />
                        <span className="truncate font-medium">
                          {driveStatus.storage.isCritical ? "Storage critical! Switch email" : "Storage running low! Switch email"}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={handleConnectDrive}
                        disabled={connectingDrive}
                        className={cn(
                          "h-5 px-2 text-[10px] font-bold shrink-0 gap-1 rounded-md",
                          driveStatus.storage.isCritical ? "bg-red-600 text-white" : "bg-amber-600 text-white"
                        )}
                      >
                        <RefreshCw className="h-2.5 w-2.5" />
                        Switch
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <CloudUpload className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    Auto-creates Classwise &gt; Subjectwise folders
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Auto-Sync</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : papers.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
            <FileText className="h-10 w-10 text-gray-400 mx-auto mb-3 opacity-60" />
            <p className="font-medium text-gray-700">No exam papers found.</p>
            <p className="text-xs text-gray-400 mt-1">Exam papers submitted by teachers will appear here for review.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {papers.map((paper) => (
              <div key={paper.id} className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden transition-all hover:border-slate-300 hover:shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3">
                  <div className="space-y-1">
                    <p className="font-semibold text-gray-900 text-base">{paper.examName}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-gray-700">{paper.teacher.user.name}</span>
                      <span>•</span>
                      <span>{paper.class.name}</span>
                      <span>•</span>
                      <span>{paper.subject.name}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      paper.status === 'SUBMITTED' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                      paper.status === 'REVIEWED' ? 'bg-green-100 text-green-800 border border-green-200' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {paper.status === 'REVIEWED' ? 'Reviewed' : paper.status === 'SUBMITTED' ? 'Submitted' : paper.status}
                    </span>

                    {paper.googleDriveWebViewLink && (
                      <a
                        href={paper.googleDriveWebViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full transition-colors"
                        title="View in Google Drive"
                      >
                        <GoogleDriveIcon className="h-3 w-3" />
                        <span>Drive</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}

                    {paper.status === 'SUBMITTED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={markReviewedMutation.isPending}
                        onClick={() => markReviewedMutation.mutate(paper.id)}
                        className="text-xs h-8"
                      >
                        {markReviewedMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-600" />}
                        Mark Reviewed
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleExpand(paper.id)}
                      className="text-xs h-8 gap-1.5"
                    >
                      <Download className="h-3.5 w-3.5 text-gray-500" />
                      {expandedPaperId === paper.id ? 'Hide Options' : 'Download Options'}
                    </Button>

                    <Link href={`/admin/exam-papers/${paper.id}`}>
                      <Button variant="outline" size="sm" className="text-xs h-8 gap-1">
                        <Eye className="h-3.5 w-3.5 text-gray-500" /> Review
                      </Button>
                    </Link>

                    <Link href={`/admin/exam-papers/${paper.id}/edit`}>
                      <Button variant="outline" size="sm" className="text-xs h-8 gap-1">
                        <Edit3 className="h-3.5 w-3.5 text-gray-500" /> Edit
                      </Button>
                    </Link>
                  </div>
                </div>
                
                {expandedPaperId === paper.id && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50/80 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-200">
                      <div>
                        <h4 className="font-semibold text-xs text-gray-700 uppercase tracking-wider">Export & Download Options</h4>
                        <p className="text-xs text-gray-500 mt-0.5">Customize download options for this exam paper</p>
                      </div>
                      <label className="inline-flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-2xs hover:bg-gray-50 transition-colors select-none">
                        <input
                          type="checkbox"
                          checked={showTeacherName}
                          onChange={(e) => handleToggleShowTeacherName(e.target.checked)}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-xs font-medium text-gray-700">
                          Show Teacher Name
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${showTeacherName ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                          {showTeacherName ? 'Visible' : 'Hidden'}
                        </span>
                      </label>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Single Student PDF */}
                      <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-2xs flex flex-col justify-between">
                        <div>
                          <h5 className="font-semibold text-sm text-blue-900 mb-1">Single Student PDF</h5>
                          <p className="text-xs text-gray-500 mb-3">Generate customized paper with student roll number pre-filled.</p>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Input
                            placeholder="Roll No."
                            value={rollNumber}
                            onChange={(e) => setRollNumber(e.target.value)}
                            className="h-8 text-xs"
                          />
                          <Button
                            size="sm"
                            disabled={downloadingType === `single-${paper.id}`}
                            onClick={() => handleDownloadSingleStudent(paper.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-xs h-8 shrink-0"
                          >
                            {downloadingType === `single-${paper.id}` && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                            Download
                          </Button>
                        </div>
                      </div>

                      {/* Bulk Download */}
                      <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-2xs flex flex-col justify-between">
                        <div>
                          <h5 className="font-semibold text-sm text-purple-900 mb-1">Bulk ZIP (Whole Class)</h5>
                          <p className="text-xs text-gray-500 mb-3">ZIP containing individual PDFs numbered 1 to N.</p>
                        </div>
                        <div className="flex gap-2 items-center">
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <span>Count:</span>
                            <Input
                              type="number"
                              min="1"
                              max="200"
                              value={studentCount}
                              onChange={(e) => setStudentCount(Number(e.target.value))}
                              className="w-16 h-8 text-xs"
                            />
                          </div>
                          <Button
                            size="sm"
                            disabled={downloadingType === `bulk-${paper.id}`}
                            onClick={() => handleDownloadBulk(paper.id)}
                            className="bg-purple-600 hover:bg-purple-700 text-xs h-8 shrink-0"
                          >
                            {downloadingType === `bulk-${paper.id}` && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                            Download ZIP
                          </Button>
                        </div>
                      </div>

                      {/* Blank PDF */}
                      <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-2xs flex flex-col justify-between">
                        <div>
                          <h5 className="font-semibold text-sm text-gray-900 mb-1">Blank PDF (Universal)</h5>
                          <p className="text-xs text-gray-500 mb-3">Download a single PDF with blank roll number field for photocopying.</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={downloadingType === `blank-${paper.id}`}
                          onClick={() => handleDownloadBlank(paper.id)}
                          className="text-xs h-8 self-start"
                        >
                          {downloadingType === `blank-${paper.id}` && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                          <Download className="mr-1.5 h-3.5 w-3.5 text-gray-500" />
                          Download PDF
                        </Button>
                      </div>

                      {/* Google Drive Upload */}
                      <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50/40 shadow-2xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <h5 className="font-semibold text-sm text-emerald-950 flex items-center gap-1.5">
                              <GoogleDriveIcon className="h-4 w-4" />
                              Google Drive
                            </h5>
                            {paper.googleDriveWebViewLink && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                                <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" /> Synced
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mb-2">
                            Auto-syncs into: <br />
                            <span className="font-semibold text-emerald-800 break-all text-[11px]">
                              Exam Papers &gt; {paper.class.name} &gt; {paper.subject.name}
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t border-emerald-100">
                          <Button
                            size="sm"
                            disabled={downloadingType === `drive-${paper.id}`}
                            onClick={() => handleUploadToDrive(paper.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 flex-1 gap-1.5"
                          >
                            {downloadingType === `drive-${paper.id}` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CloudUpload className="h-3.5 w-3.5" />
                            )}
                            {paper.googleDriveWebViewLink ? 'Re-upload' : 'Upload to Drive'}
                          </Button>
                          {paper.googleDriveWebViewLink && (
                            <a
                              href={paper.googleDriveWebViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center h-8 px-2.5 rounded-lg border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-700 text-xs font-medium transition-colors shrink-0"
                              title="Open in Google Drive"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
