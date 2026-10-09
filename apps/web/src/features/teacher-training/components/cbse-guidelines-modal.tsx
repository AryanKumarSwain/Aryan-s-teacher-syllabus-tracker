'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ANNEXURE_I_TOPICS,
  ANNEXURE_II_TOPICS,
  ANNEXURE_III_TOPICS,
  ACADEMIC_ACTIVITIES,
  DOMAIN_INFO,
} from '../constants/cbse-catalog';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  BookOpen,
  Award,
  Layers,
} from 'lucide-react';

interface CbseGuidelinesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CbseGuidelinesModal({ open, onOpenChange }: CbseGuidelinesModalProps) {
  const [activeTab, setActiveTab] = useState('annexure1');
  const [search, setSearch] = useState('');

  const filterTopics = (topics: typeof ANNEXURE_I_TOPICS) => {
    if (!search.trim()) return topics;
    return topics.filter(
      (t) =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.description?.toLowerCase().includes(search.toLowerCase()),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] sm:w-full max-w-4xl max-h-[92vh] sm:max-h-[88vh] p-0 overflow-hidden flex flex-col rounded-3xl border border-slate-200/90 bg-white shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 via-white to-blue-50/30 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 ring-4 ring-blue-50 shrink-0">
              <Award className="h-5 w-5 text-white" />
            </div>
            <div className="text-left">
              <DialogTitle className="text-base sm:text-lg font-black text-[#0b1c30]">
                CBSE Continuous Professional Development (CPD) Guidelines - 2025
              </DialogTitle>
              <p className="text-[11px] text-slate-500 font-medium">
                Notification No. TRG-02/2025 • Ref: Affiliation Notification 16/2021 & Clause 12.2.9
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

        {/* Notice Highlights Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-2">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">
                Mandatory Requirement
              </span>
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-900 mt-1">50 Hours / Year</p>
            <p className="text-xs text-blue-700 mt-0.5">
              Every teacher & principal must complete 50 hours of CPD per academic session.
            </p>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-800 uppercase tracking-wider">
                Split Distribution
              </span>
              <Layers className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-lg font-bold text-indigo-900">25h CBSE</p>
              <span className="text-gray-400">+</span>
              <p className="text-lg font-bold text-indigo-900">25h School</p>
            </div>
            <p className="text-xs text-indigo-700 mt-0.5">
              25h by CBSE/COE & 25h by School/In-house/Academic duties.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                Affiliation Clause 12.2.9
              </span>
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-sm font-semibold text-amber-900 mt-1">Mandatory Compliance</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Schools that fail to fulfill mandatory training face penalties under Affiliation Bye-Laws.
            </p>
          </div>
        </div>

        {/* 3 Domains Breakdown Card */}
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            NPST Standards / Domains Distribution
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.values(DOMAIN_INFO).map((domain) => (
              <div
                key={domain.id}
                className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:border-blue-400 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800">{domain.title.split(':')[0]}</span>
                  <Badge variant="outline" className={domain.badgeClass}>
                    {domain.totalHours} Hours Total
                  </Badge>
                </div>
                <p className="text-xs font-medium text-gray-900 mt-1">
                  {domain.title.split(':')[1]}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                  <span>CBSE: {domain.cbseHours}h</span>
                  <span>•</span>
                  <span>School: {domain.schoolHours}h</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5 leading-snug">
                  {domain.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Annexures Tabs & Search */}
        <div className="mt-2">
          <div className="flex items-center justify-between gap-4 mb-3">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[#1a73e8]" />
              Official CBSE Topic Catalogs (Annexures)
            </h4>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Search topics..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-gray-100 rounded-lg">
            {[
              { id: 'annexure1', label: 'Annexure I (Ethics)' },
              { id: 'annexure2', label: 'Annexure II (Knowledge)' },
              { id: 'annexure3', label: 'Annexure III (Growth)' },
              { id: 'academic', label: 'Academic Activities' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-1.5 px-2 rounded-md text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-[#1a73e8] shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Annexure I */}
          {activeTab === 'annexure1' && (
            <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
              {filterTopics(ANNEXURE_I_TOPICS).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 bg-white hover:bg-gray-50 text-xs"
                >
                  <div>
                    <p className="font-medium text-gray-800">{t.title}</p>
                    <p className="text-[11px] text-gray-500">{t.description}</p>
                  </div>
                  <Badge variant="secondary" className="bg-indigo-50 text-indigo-700">
                    {t.defaultHours} Hours
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {/* Annexure II */}
          {activeTab === 'annexure2' && (
            <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
              {filterTopics(ANNEXURE_II_TOPICS).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 bg-white hover:bg-gray-50 text-xs"
                >
                  <div>
                    <p className="font-medium text-gray-800">{t.title}</p>
                    <p className="text-[11px] text-gray-500">{t.description}</p>
                  </div>
                  <Badge variant="secondary" className="bg-sky-50 text-sky-700">
                    {t.defaultHours} Hours
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {/* Annexure III */}
          {activeTab === 'annexure3' && (
            <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
              {filterTopics(ANNEXURE_III_TOPICS).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 bg-white hover:bg-gray-50 text-xs"
                >
                  <div>
                    <p className="font-medium text-gray-800">{t.title}</p>
                    <p className="text-[11px] text-gray-500">{t.description}</p>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                    {t.defaultHours} Hours
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {/* Academic Activities */}
          {activeTab === 'academic' && (
            <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
              <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-800 mb-2">
                <p className="font-semibold">Note from Circular:</p>
                <p className="text-[11px] mt-0.5">
                  Academic activities by teachers/principals can be counted towards the 11 hours School portion of Professional Growth & Development. Maximum 11 hours considered.
                </p>
              </div>
              {filterTopics(ACADEMIC_ACTIVITIES).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 bg-white hover:bg-gray-50 text-xs"
                >
                  <div>
                    <p className="font-medium text-gray-800">{t.title}</p>
                    <p className="text-[11px] text-gray-500">{t.description}</p>
                  </div>
                  <Badge variant="secondary" className="bg-purple-50 text-purple-700">
                    Up to {t.defaultHours}h
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs shadow-2xs transition-colors"
          >
            Close Guidelines
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
