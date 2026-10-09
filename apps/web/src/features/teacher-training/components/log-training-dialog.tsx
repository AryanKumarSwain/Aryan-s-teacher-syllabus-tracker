'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  ANNEXURE_I_TOPICS,
  ANNEXURE_II_TOPICS,
  ANNEXURE_III_TOPICS,
  ACADEMIC_ACTIVITIES,
  DOMAIN_INFO,
} from '../constants/cbse-catalog';
import {
  useCreateTraining,
  useCreateMyTraining,
  TeacherCpdItem,
} from '../hooks/use-teacher-training';
import {
  Award,
  Calendar,
  Clock,
  MapPin,
  Users,
  Sparkles,
  Search,
  ChevronDown,
  Check,
  X,
  User,
} from 'lucide-react';

interface LogTrainingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teachers?: TeacherCpdItem[];
  preselectedTeacherId?: string;
  isTeacherPortal?: boolean;
}

export function LogTrainingDialog({
  open,
  onOpenChange,
  teachers = [],
  preselectedTeacherId,
  isTeacherPortal = false,
}: LogTrainingDialogProps) {
  const createAdminTraining = useCreateTraining();
  const createMyTraining = useCreateMyTraining();

  const [targetType, setTargetType] = useState<'single' | 'bulk'>('single');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(preselectedTeacherId || '');
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [singleSearch, setSingleSearch] = useState('');
  const [singleOpen, setSingleOpen] = useState(false);
  const [bulkSearch, setBulkSearch] = useState('');
  const comboboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setSingleOpen(false);
      }
    }
    if (singleOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [singleOpen]);

  const filteredSingleTeachers = useMemo(() => {
    if (!singleSearch.trim()) return teachers;
    const q = singleSearch.toLowerCase();
    return teachers.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.subjectNames.some((s) => s.toLowerCase().includes(q)),
    );
  }, [teachers, singleSearch]);

  const filteredBulkTeachers = useMemo(() => {
    if (!bulkSearch.trim()) return teachers;
    const q = bulkSearch.toLowerCase();
    return teachers.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.subjectNames.some((s) => s.toLowerCase().includes(q)),
    );
  }, [teachers, bulkSearch]);

  const currentSelectedTeacher = useMemo(() => {
    return teachers.find((t) => t.teacherId === selectedTeacherId);
  }, [teachers, selectedTeacherId]);

  // Category tab for selecting prescribed topics
  const [categoryType, setCategoryType] = useState<'annexure1' | 'annexure2' | 'annexure3' | 'academic' | 'custom'>('annexure1');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('ann1-1');

  // Form fields
  const [title, setTitle] = useState('');
  const [domain, setDomain] = useState<'CORE_VALUES_ETHICS' | 'KNOWLEDGE_PRACTICE' | 'PROFESSIONAL_GROWTH'>('CORE_VALUES_ETHICS');
  const [annexure, setAnnexure] = useState<string>('ANNEXURE_I');
  const [provider, setProvider] = useState<'CBSE' | 'SCHOOL' | 'SAHODAYA' | 'OTHER'>('CBSE');
  const [trainingMode, setTrainingMode] = useState<'OFFLINE' | 'ONLINE' | 'BLENDED'>('OFFLINE');
  const [hours, setHours] = useState<number>(12);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0] || '');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0] || '');
  const [organizedBy, setOrganizedBy] = useState('');
  const [resourcePerson, setResourcePerson] = useState('');
  const [locationOrPlatform, setLocationOrPlatform] = useState('');
  const [certificateNumber, setCertificateNumber] = useState('');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (preselectedTeacherId) {
      setSelectedTeacherId(preselectedTeacherId);
      setTargetType('single');
    } else if (teachers.length > 0 && !selectedTeacherId) {
      setSelectedTeacherId(teachers[0]?.teacherId || '');
    }
  }, [preselectedTeacherId, teachers]);

  // Handle category tab change
  const handleCategoryChange = (cat: 'annexure1' | 'annexure2' | 'annexure3' | 'academic' | 'custom') => {
    setCategoryType(cat);
    if (cat === 'annexure1') {
      const t = ANNEXURE_I_TOPICS[0];
      if (t) applyTopic(t);
    } else if (cat === 'annexure2') {
      const t = ANNEXURE_II_TOPICS[0];
      if (t) applyTopic(t);
    } else if (cat === 'annexure3') {
      const t = ANNEXURE_III_TOPICS[0];
      if (t) applyTopic(t);
    } else if (cat === 'academic') {
      const t = ACADEMIC_ACTIVITIES[0];
      if (t) applyTopic(t);
    } else {
      setSelectedTopicId('custom');
      setTitle('');
      setAnnexure('OTHER');
    }
  };

  const applyTopic = (topic: any) => {
    setSelectedTopicId(topic.id);
    setTitle(topic.title);
    setDomain(topic.domain);
    setAnnexure(topic.annexure);
    setHours(topic.defaultHours);
    if (topic.annexure === 'ANNEXURE_I') {
      setProvider('CBSE');
      setTrainingMode('OFFLINE');
    } else if (topic.annexure === 'ACADEMIC_ACTIVITY') {
      setProvider('SCHOOL');
      setTrainingMode('OFFLINE');
    }
  };

  const handleSelectAllTeachers = (checked: boolean) => {
    if (checked) {
      setSelectedTeacherIds(teachers.map((t) => t.teacherId));
    } else {
      setSelectedTeacherIds([]);
    }
  };

  const handleToggleTeacher = (tId: string) => {
    setSelectedTeacherIds((prev) =>
      prev.includes(tId) ? prev.filter((id) => id !== tId) : [...prev, tId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please provide a training title / topic');
      return;
    }
    if (hours <= 0) {
      alert('Hours must be greater than 0');
      return;
    }

    const payload = {
      title,
      domain,
      annexure,
      provider,
      trainingMode,
      hours: Number(hours),
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      organizedBy: organizedBy || undefined,
      resourcePerson: resourcePerson || undefined,
      locationOrPlatform: locationOrPlatform || undefined,
      isAcademicActivity: categoryType === 'academic',
      certificateNumber: certificateNumber || undefined,
      remarks: remarks || undefined,
      status: isTeacherPortal ? ('SUBMITTED' as const) : ('VERIFIED' as const),
    };

    if (isTeacherPortal) {
      await createMyTraining.mutateAsync(payload);
    } else {
      if (targetType === 'bulk') {
        if (selectedTeacherIds.length === 0) {
          alert('Please select at least one teacher');
          return;
        }
        await createAdminTraining.mutateAsync({
          ...payload,
          teacherIds: selectedTeacherIds,
        });
      } else {
        if (!selectedTeacherId) {
          alert('Please select a teacher');
          return;
        }
        await createAdminTraining.mutateAsync({
          ...payload,
          teacherId: selectedTeacherId,
        });
      }
    }

    onOpenChange(false);
  };

  const isSubmitting = createAdminTraining.isPending || createMyTraining.isPending;

  // Active topic list based on category
  const activeTopics =
    categoryType === 'annexure1'
      ? ANNEXURE_I_TOPICS
      : categoryType === 'annexure2'
      ? ANNEXURE_II_TOPICS
      : categoryType === 'annexure3'
      ? ANNEXURE_III_TOPICS
      : categoryType === 'academic'
      ? ACADEMIC_ACTIVITIES
      : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] sm:w-full max-w-2xl max-h-[92vh] sm:max-h-[88vh] p-0 overflow-hidden flex flex-col rounded-3xl border border-slate-200/90 bg-white shadow-2xl">
        <DialogHeader className="px-5 sm:px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 via-white to-blue-50/30 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 ring-4 ring-blue-50 shrink-0">
              <Award className="h-5 w-5 text-white" />
            </div>
            <div className="text-left">
              <DialogTitle className="text-base sm:text-lg font-black text-[#0b1c30]">
                {isTeacherPortal ? 'Log My Completed Training' : 'Log Teacher Training Record'}
              </DialogTitle>
              <p className="text-[11px] text-slate-500 font-medium">
                Continuous Professional Development (CPD) • CBSE Circular TRG-02/2025
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
          {/* Target Teacher Selection (Admin Only) */}
          {!isTeacherPortal && (
            <div className="bg-gray-50/75 border border-gray-200 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-[#1a73e8]" />
                  Select Teacher(s)
                </Label>
                <div className="flex items-center gap-1 bg-gray-200/60 p-0.5 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setTargetType('single')}
                    className={`px-3 py-1 rounded-md font-medium transition-all ${
                      targetType === 'single'
                        ? 'bg-white shadow-xs text-[#1a73e8]'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Single Teacher
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType('bulk')}
                    className={`px-3 py-1 rounded-md font-medium transition-all ${
                      targetType === 'bulk'
                        ? 'bg-white shadow-xs text-[#1a73e8]'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Bulk / Workshop Mode
                  </button>
                </div>
              </div>

              {targetType === 'single' ? (
                <div ref={comboboxRef} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setSingleOpen(!singleOpen);
                      setSingleSearch('');
                    }}
                    className="w-full flex items-center justify-between h-9 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg shadow-xs hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20 transition-all text-left"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      {currentSelectedTeacher ? (
                        <span className="truncate text-gray-900 font-medium">
                          {currentSelectedTeacher.name}{' '}
                          <span className="text-gray-500 font-normal">
                            ({currentSelectedTeacher.subjectNames.join(', ') || 'General'})
                          </span>{' '}
                          <span className="text-gray-400 font-normal">
                            — {currentSelectedTeacher.totalHours}/50h
                          </span>
                        </span>
                      ) : (
                        <span className="text-gray-400">Select a teacher...</span>
                      )}
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
                  </button>

                  {singleOpen && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden p-1.5 animate-in fade-in-50 zoom-in-95">
                      {/* Search Input Box */}
                      <div className="relative mb-1">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                        <Input
                          placeholder="Search teacher by name or subject..."
                          value={singleSearch}
                          onChange={(e) => setSingleSearch(e.target.value)}
                          className="h-8 pl-8 pr-7 text-xs bg-gray-50/75 border-gray-200 focus-visible:bg-white"
                          autoFocus
                        />
                        {singleSearch && (
                          <button
                            type="button"
                            onClick={() => setSingleSearch('')}
                            className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Filtered Teachers List */}
                      <div className="max-h-48 overflow-y-auto space-y-0.5">
                        {filteredSingleTeachers.length === 0 ? (
                          <div className="py-6 text-center text-xs text-gray-400">
                            No teacher found matching "{singleSearch}"
                          </div>
                        ) : (
                          filteredSingleTeachers.map((t) => {
                            const isSelected = t.teacherId === selectedTeacherId;
                            return (
                              <button
                                key={t.teacherId}
                                type="button"
                                onClick={() => {
                                  setSelectedTeacherId(t.teacherId);
                                  setSingleOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors text-left ${
                                  isSelected
                                    ? 'bg-blue-50 text-[#1a73e8] font-semibold'
                                    : 'text-gray-700 hover:bg-gray-100'
                                }`}
                              >
                                <div className="truncate">
                                  <span>{t.name}</span>{' '}
                                  <span className="text-gray-500 font-normal">
                                    ({t.subjectNames.join(', ') || 'General'})
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                  <span className="text-[11px] text-gray-400">
                                    {t.totalHours}/50h
                                  </span>
                                  {isSelected && <Check className="h-3.5 w-3.5 text-[#1a73e8]" />}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Search box for Bulk Mode */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                    <Input
                      placeholder="Search teachers by name or subject to select..."
                      value={bulkSearch}
                      onChange={(e) => setBulkSearch(e.target.value)}
                      className="h-8 pl-8 text-xs bg-white"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs px-1 text-gray-600">
                    <label className="flex items-center gap-2 cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        checked={
                          selectedTeacherIds.length === teachers.length && teachers.length > 0
                        }
                        onChange={(e) => handleSelectAllTeachers(e.target.checked)}
                        className="rounded border-gray-300 text-[#1a73e8] focus:ring-[#1a73e8] h-4 w-4"
                      />
                      Select All Teachers ({teachers.length})
                    </label>
                    <span className="text-gray-400">
                      {selectedTeacherIds.length} of {teachers.length} selected
                    </span>
                  </div>
                  <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-xl p-2 bg-white space-y-1">
                    {filteredBulkTeachers.length === 0 ? (
                      <div className="py-4 text-center text-xs text-gray-400">
                        No teachers match "{bulkSearch}"
                      </div>
                    ) : (
                      filteredBulkTeachers.map((t) => (
                        <label
                          key={t.teacherId}
                          className="flex items-center justify-between p-1.5 rounded-lg hover:bg-gray-50 text-xs cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedTeacherIds.includes(t.teacherId)}
                              onChange={() => handleToggleTeacher(t.teacherId)}
                              className="rounded border-gray-300 text-[#1a73e8] focus:ring-[#1a73e8] h-4 w-4"
                            />
                            <span className="font-medium text-gray-800">{t.name}</span>
                            <span className="text-gray-400 text-[11px]">
                              ({t.subjectNames.join(', ') || 'General'})
                            </span>
                          </div>
                          <span className="text-gray-400 text-[11px]">{t.totalHours}h logged</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Topic Preset Category Tabs */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Prescribed Topic Category (CBSE Circular TRG-02/2025)
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/70">
              {[
                { id: 'annexure1', label: 'Annexure I (Ethics)' },
                { id: 'annexure2', label: 'Annexure II (Practice)' },
                { id: 'annexure3', label: 'Annexure III (Growth)' },
                { id: 'academic', label: 'Academic Duties' },
                { id: 'custom', label: '+ Custom Topic' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleCategoryChange(tab.id as any)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center ${
                    categoryType === tab.id
                      ? 'bg-white text-blue-700 shadow-2xs border border-slate-200/80 font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* If a prescribed category is active, show topic dropdown */}
            {categoryType !== 'custom' && (
              <div className="pt-1">
                <Select
                  value={selectedTopicId}
                  onValueChange={(val) => {
                    const t = activeTopics.find((item) => item.id === val);
                    if (t) applyTopic(t);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200 bg-white hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs font-medium">
                    <SelectValue placeholder="Choose a prescribed topic..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-xl shadow-xl border-slate-200">
                    {activeTopics.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">
                        {t.title} ({t.defaultHours} Hours)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Topic Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Topic / Training Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Experiential Learning Workshop or Happy Classrooms"
              className="h-9 text-xs rounded-xl border-slate-200 bg-white hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
              required
            />
          </div>

          {/* Domain & Organizer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">NPST Domain *</Label>
              <Select value={domain} onValueChange={(v: any) => setDomain(v)}>
                <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200 bg-white hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl shadow-xl border-slate-200">
                  <SelectItem value="CORE_VALUES_ETHICS">
                    Domain 1: Core Values & Ethics (12h)
                  </SelectItem>
                  <SelectItem value="KNOWLEDGE_PRACTICE">
                    Domain 2: Knowledge & Practice (24h)
                  </SelectItem>
                  <SelectItem value="PROFESSIONAL_GROWTH">
                    Domain 3: Professional Growth (14h)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Organizer / Provider *</Label>
              <Select value={provider} onValueChange={(v: any) => setProvider(v)}>
                <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200 bg-white hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl shadow-xl border-slate-200">
                  <SelectItem value="CBSE">
                    CBSE / COE Regional Institute (25h quota)
                  </SelectItem>
                  <SelectItem value="SCHOOL">
                    School / In-house (25h quota)
                  </SelectItem>
                  <SelectItem value="SAHODAYA">
                    Sahodaya School Complex (25h quota)
                  </SelectItem>
                  <SelectItem value="OTHER">
                    Other Recognised Body
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Mode & Hours Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Training Mode *</Label>
              <Select value={trainingMode} onValueChange={(v: any) => setTrainingMode(v)}>
                <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200 bg-white hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl shadow-xl border-slate-200">
                  <SelectItem value="OFFLINE">Offline (Face to Face)</SelectItem>
                  <SelectItem value="ONLINE">Online / Webinar / PM e-Vidya</SelectItem>
                  <SelectItem value="BLENDED">Blended Mode</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Duration (Hours) *</span>
                <span className="text-[11px] font-semibold text-slate-400">e.g. 2, 3, 6, 12, 18</span>
              </Label>
              <Input
                type="number"
                step="0.5"
                min="0.5"
                max="50"
                value={hours}
                onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
                className="h-9 text-xs rounded-xl border-slate-200 bg-white hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
                required
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-xs rounded-xl border-slate-200 bg-white hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-xs rounded-xl border-slate-200 bg-white hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
              />
            </div>
          </div>

          {/* Organizer, Resource Person & Location */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Organized By</Label>
              <Input
                placeholder="e.g. CBSE COE / School"
                value={organizedBy}
                onChange={(e) => setOrganizedBy(e.target.value)}
                className="h-9 text-xs rounded-xl border-slate-200 bg-white hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Resource Person</Label>
              <Input
                placeholder="e.g. Dr. R. Sharma"
                value={resourcePerson}
                onChange={(e) => setResourcePerson(e.target.value)}
                className="h-9 text-xs rounded-xl border-slate-200 bg-white hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Location / Platform</Label>
              <Input
                placeholder="e.g. Auditorium / Zoom"
                value={locationOrPlatform}
                onChange={(e) => setLocationOrPlatform(e.target.value)}
                className="h-9 text-xs rounded-xl border-slate-200 bg-white hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
              />
            </div>
          </div>

          {/* Certificate & Remarks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Certificate / Reference Number
              </Label>
              <Input
                placeholder="e.g. CBSE/TRG/2025/10492"
                value={certificateNumber}
                onChange={(e) => setCertificateNumber(e.target.value)}
                className="h-9 text-xs rounded-xl border-slate-200 bg-white hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Remarks / OASIS Notes</Label>
              <Input
                placeholder="Additional details for OASIS portal"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="h-9 text-xs rounded-xl border-slate-200 bg-white hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
              />
            </div>
          </div>

          </div>

          <DialogFooter className="px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-9 px-4 rounded-xl border-slate-200 text-slate-700 font-bold hover:bg-slate-100 text-xs shadow-2xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="h-9 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 active:scale-95 transition-all"
            >
              {isSubmitting ? 'Saving...' : 'Save Training Record'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
