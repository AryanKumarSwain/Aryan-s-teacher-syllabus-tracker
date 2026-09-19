'use client';

import { useState, useEffect } from 'react';
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
import { Award, Calendar, Clock, MapPin, Users, Sparkles } from 'lucide-react';

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
      locationOrPlatform: locationOrPlatform || undefined,
      isAcademicActivity: categoryType === 'academic',
      certificateNumber: certificateNumber || undefined,
      remarks: remarks || undefined,
      status: 'VERIFIED' as const,
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white border border-gray-200 p-6 shadow-2xl">
        <DialogHeader className="border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#1a73e8]">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900">
                {isTeacherPortal ? 'Log My Completed Training' : 'Log Teacher Training Record'}
              </DialogTitle>
              <p className="text-xs text-gray-500">
                Continuous Professional Development (CPD) • CBSE Circular TRG-02/2025
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
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
                <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select a teacher..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {teachers.map((t) => (
                      <SelectItem key={t.teacherId} value={t.teacherId}>
                        {t.name} ({t.subjectNames.join(', ') || 'General'}) — {t.totalHours}/50h
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="space-y-2">
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
                    {teachers.map((t) => (
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
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Topic Preset Category Tabs */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Prescribed Topic Category (CBSE Circular TRG-02/2025)
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1 p-1 bg-gray-100 rounded-xl">
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
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                    categoryType === tab.id
                      ? 'bg-white text-[#1a73e8] shadow-xs'
                      : 'text-gray-500 hover:text-gray-900'
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
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Choose a prescribed topic..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {activeTopics.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
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
            <Label className="text-xs font-semibold text-gray-700">Topic / Training Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Experiential Learning Workshop or Happy Classrooms"
              className="text-xs bg-white"
              required
            />
          </div>

          {/* Domain & Organizer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">NPST Domain *</Label>
              <Select value={domain} onValueChange={(v: any) => setDomain(v)}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
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
              <Label className="text-xs font-semibold text-gray-700">Organizer / Provider *</Label>
              <Select value={provider} onValueChange={(v: any) => setProvider(v)}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
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
              <Label className="text-xs font-semibold text-gray-700">Training Mode *</Label>
              <Select value={trainingMode} onValueChange={(v: any) => setTrainingMode(v)}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="OFFLINE">Offline (Face to Face)</SelectItem>
                  <SelectItem value="ONLINE">Online / Webinar / PM e-Vidya</SelectItem>
                  <SelectItem value="BLENDED">Blended Mode</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                <span>Duration (Hours) *</span>
                <span className="text-[11px] text-gray-400">e.g. 2, 3, 6, 12, 18</span>
              </Label>
              <Input
                type="number"
                step="0.5"
                min="0.5"
                max="50"
                value={hours}
                onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
                className="text-xs bg-white"
                required
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs bg-white"
              />
            </div>
          </div>

          {/* Organizer & Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Organized By</Label>
              <Input
                placeholder="e.g. CBSE COE Chandigarh / School In-house"
                value={organizedBy}
                onChange={(e) => setOrganizedBy(e.target.value)}
                className="text-xs bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Location / Platform</Label>
              <Input
                placeholder="e.g. School Auditorium / Zoom / DIKSHA"
                value={locationOrPlatform}
                onChange={(e) => setLocationOrPlatform(e.target.value)}
                className="text-xs bg-white"
              />
            </div>
          </div>

          {/* Certificate & Remarks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">
                Certificate / Reference Number
              </Label>
              <Input
                placeholder="e.g. CBSE/TRG/2025/10492"
                value={certificateNumber}
                onChange={(e) => setCertificateNumber(e.target.value)}
                className="text-xs bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Remarks / OASIS Notes</Label>
              <Input
                placeholder="Additional details for OASIS portal"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="text-xs bg-white"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-gray-100 pt-3 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="border-gray-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-[#1a73e8] hover:bg-[#1558b0] text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Training Record'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
