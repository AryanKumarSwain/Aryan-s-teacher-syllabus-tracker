'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Users,
  TrendingUp,
  BarChart3,
  PieChart as PieIcon,
  Sparkles,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { api } from '@/services/api-client';
import type { DashboardStats } from '@school-syllabus/types';
import { formatPercent } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

/* ─────────────────────────────────────────────
   Premium Cohesive School ERP Color Scheme Matrix
   ───────────────────────────────────────────── */
const CHART_COLORS = [
  '#6366f1', // Indigo / Mathematics
  '#a855f7', // Purple / Science
  '#ec4899', // Pink / English
  '#10b981', // Emerald / History
  '#f59e0b', // Amber / Others
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#f43f5e', // Rose
];

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  cardBg: string;
  borderColor: string;
  sub?: string;
  trend?: string;
}

function StatCard({
  title,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  cardBg,
  borderColor,
  sub,
  trend,
}: StatCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${borderColor} ${cardBg} px-5 py-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md`}
    >
      <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-current opacity-10" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500/80">{title}</p>
          <p className="mt-2 text-3xl font-black leading-none tracking-tight text-gray-800">
            {value}
          </p>
          {sub && <p className="mt-2 text-xs font-medium text-gray-500">{sub}</p>}
          {trend && (
            <span className="mt-2.5 inline-flex items-center gap-1 rounded-full border border-emerald-200/50 bg-emerald-100/70 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              <TrendingUp className="h-3 w-3" />
              {trend}
            </span>
          )}
        </div>
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconBg} border border-white/20 shadow-sm`}
        >
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  extra,
  children,
}: {
  title: string;
  icon: React.ElementType;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="flex items-center justify-between bg-gradient-to-r from-[#1a73e8] to-[#1558b0] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <Icon className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-sm font-bold tracking-wide text-white">{title}</h3>
        </div>
        {extra && <div className="flex items-center">{extra}</div>}
      </div>
      <div className="bg-slate-50/30 p-6">{children}</div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [selectedClass, setSelectedClass] = useState<string>('all');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.get<DashboardStats>('/dashboard/stats'),
  });

  const { data: analytics } = useQuery({
    queryKey: ['dashboard', 'analytics'],
    queryFn: () =>
      api.get<{
        subjectProgress: {
          name: string;
          progress: number;
          classId?: string;
          className?: string;
          totalChapters?: number;
        }[];
        teacherProgress?: { name: string; progress: number; classId?: string }[];
      }>('/dashboard/analytics'),
  });

  // Extract class options dynamically from data mapping
  const classOptions = useMemo(() => {
    if (!analytics?.subjectProgress) return [];
    const classMap = new Map<string, string>();
    analytics.subjectProgress.forEach((item) => {
      if (item.classId && item.className) {
        classMap.set(item.classId, item.className);
      }
    });
    return Array.from(classMap.entries()).map(([id, name]) => ({ id, name }));
  }, [analytics]);

  // Filter subject dataset based on selected drop-down value
  const filteredSubjectData = useMemo(() => {
    if (!analytics?.subjectProgress) return [];
    const baseData =
      selectedClass === 'all'
        ? analytics.subjectProgress
        : analytics.subjectProgress.filter((item) => item.classId === selectedClass);

    return baseData.map((item, index) => ({
      ...item,
      fillColor: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [analytics, selectedClass]);

  // Compute metrics for the Subject Progress Pie Chart
  const pieChartData = useMemo(() => {
    if (filteredSubjectData.length === 0) return [];

    return filteredSubjectData.map((item, index) => ({
      name: item.name,
      value: item.progress || 0,
      color: item.fillColor,
    }));
  }, [filteredSubjectData]);

  // Calculate the average progress of the currently filtered view
  const averageClassProgress = useMemo(() => {
    if (filteredSubjectData.length === 0) return 0;
    const total = filteredSubjectData.reduce((acc, curr) => acc + curr.progress, 0);
    return Math.round(total / filteredSubjectData.length);
  }, [filteredSubjectData]);

  if (isLoading) {
    return (
      <DashboardShell title="Dashboard">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-200/70" />
          ))}
        </div>
      </DashboardShell>
    );
  }

  const overallPct = stats?.overallProgress ?? 0;

  return (
    <DashboardShell title="Dashboard">
      <div className="space-y-6 pb-8">
        {/* ── Top Overview Banner Row ── */}
        <Section title="System Overview Breakdown" icon={Sparkles}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Teachers"
              value={stats?.totalTeachers ?? 0}
              icon={Users}
              iconBg="bg-indigo-500"
              iconColor="text-white"
              cardBg="bg-indigo-50/40"
              borderColor="border-indigo-100"
            />
            <StatCard
              title="Active Classes"
              value={stats?.totalClasses ?? 0}
              icon={GraduationCap}
              iconBg="bg-cyan-500"
              iconColor="text-white"
              cardBg="bg-cyan-50/40"
              borderColor="border-cyan-100"
            />
            <StatCard
              title="Syllabus Chapters"
              value={stats?.totalChapters ?? 0}
              icon={BookOpen}
              iconBg="bg-amber-500"
              iconColor="text-white"
              cardBg="bg-amber-50/40"
              borderColor="border-amber-100"
            />
            <StatCard
              title="Overall Progress"
              value={formatPercent(overallPct)}
              icon={CheckCircle2}
              iconBg="bg-emerald-500"
              iconColor="text-white"
              cardBg="bg-emerald-50/40"
              borderColor="border-emerald-100"
              sub={`${stats?.completedChapters ?? 0} chapters completed`}
            />
          </div>
        </Section>

        {/* ── Core Analysis Row: Bar vs Pie Connected via Class Selection Dropdown ── */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Bar Chart Panel */}
          <div className="lg:col-span-2">
            <Section
              title="Subject Completion Performance"
              icon={BarChart3}
              extra={
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="cursor-pointer rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white outline-none backdrop-blur-md transition-all hover:bg-white/20 focus:bg-white focus:text-gray-900"
                >
                  <option value="all" className="text-gray-900">
                    All Active Classes
                  </option>
                  {classOptions.map((c) => (
                    <option key={c.id} value={c.id} className="text-gray-900">
                      {c.name}
                    </option>
                  ))}
                </select>
              }
            >
              {filteredSubjectData.length === 0 ? (
                <div className="flex h-72 flex-col items-center justify-center text-center">
                  <AlertTriangle className="h-8 w-8 animate-bounce text-amber-500" />
                  <p className="mt-2 text-sm font-medium text-gray-500">
                    No core parameters structuralized for this class context.
                  </p>
                </div>
              ) : (
                <div className="h-80 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      key={selectedClass}
                      data={filteredSubjectData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip
                        cursor={{ fill: '#f1f5f9/50' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const dataItem = payload[0].payload;
                            return (
                              <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-xl backdrop-blur-sm">
                                <p className="text-xs font-bold text-gray-800">{dataItem.name}</p>
                                <p className="mt-0.5 text-[10px] font-medium text-gray-400">
                                  {dataItem.className || 'Academic Syllabus'}
                                </p>
                                <div className="mt-2 flex items-center gap-2">
                                  <div
                                    className="h-2.5 w-2.5 rounded-full"
                                    style={{ backgroundColor: dataItem.fillColor }}
                                  />
                                  <p className="text-xs font-black text-gray-700">
                                    Completion: {payload[0].value}%
                                  </p>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar
                        dataKey="progress"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={38}
                        animationDuration={1000}
                        animationEasing="ease-out"
                      >
                        {filteredSubjectData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fillColor} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Section>
          </div>

          {/* Subject Progress Pie Chart (Connected to Dropdown Filtering) */}
          <div className="lg:col-span-1">
            <Section
              title={selectedClass === 'all' ? 'Global Subject Progress' : 'Class Subject Progress'}
              icon={PieIcon}
            >
              {pieChartData.length === 0 ? (
                <div className="flex h-72 flex-col items-center justify-center text-center text-gray-400">
                  <PieIcon className="h-8 w-8 animate-pulse stroke-1" />
                  <p className="mt-2 text-xs font-medium">
                    Select a valid class configuration filter
                  </p>
                </div>
              ) : (
                <div className="relative flex h-80 flex-col items-center justify-center">
                  <div className="h-[62%] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart key={selectedClass}>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={62}
                          outerRadius={82}
                          paddingAngle={3}
                          dataKey="value"
                          animationDuration={800}
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value}%`, 'Completion Percentage']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Central Text Indicator displaying average progress of current view */}
                  <div className="absolute top-[26%] flex flex-col items-center text-center">
                    <span className="text-3xl font-black tracking-tight text-gray-800">
                      {selectedClass === 'all'
                        ? formatPercent(overallPct)
                        : `${averageClassProgress}%`}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
                      Avg Progress
                    </span>
                  </div>

                  {/* Dynamic Color Legend List */}
                  <div className="mt-2 max-h-[110px] w-full space-y-1.5 overflow-y-auto px-1">
                    {pieChartData.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-1.5 transition-all hover:bg-slate-100/50"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="truncate text-xs font-semibold text-gray-600">
                            {item.name}
                          </span>
                        </div>
                        <span className="ml-2 text-xs font-black text-gray-700">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          </div>
        </div>

        {/* ── Lower Split Layout Panel: Incremental Volume vs Teacher Progress ── */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Volumetric Incremental Status Card */}
          <Section title="Incremental Chapter Volume Status" icon={Layers}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-4 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 transition-all">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-emerald-500 shadow-sm">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                    Completed
                  </p>
                  <p className="text-2.5xl mt-0.5 font-black leading-none text-emerald-700">
                    {stats?.completedChapters ?? 0}
                  </p>
                </div>
                <div className="h-10 w-1 overflow-hidden rounded-full bg-emerald-200">
                  <div
                    className="w-full rounded-full bg-emerald-600 transition-all duration-500"
                    style={{
                      height: `${stats?.totalChapters ? Math.round(((stats.completedChapters ?? 0) / stats.totalChapters) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-xl border border-amber-100 bg-amber-50/40 p-4 transition-all">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-amber-500 shadow-sm">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
                    Pending Scope
                  </p>
                  <p className="text-2.5xl mt-0.5 font-black leading-none text-amber-700">
                    {stats?.pendingChapters ?? 0}
                  </p>
                </div>
                <div className="h-10 w-1 overflow-hidden rounded-full bg-amber-200">
                  <div
                    className="w-full rounded-full bg-amber-600 transition-all duration-500"
                    style={{
                      height: `${stats?.totalChapters ? Math.round(((stats.pendingChapters ?? 0) / stats.totalChapters) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-600">
                  Overall Courseware Completion Target
                </span>
                <span className="font-black text-[#1a73e8]">{formatPercent(overallPct)}</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#1a73e8] via-indigo-500 to-[#34a853] transition-all duration-1000"
                  style={{ width: `${Math.min(overallPct, 100)}%` }}
                />
              </div>
            </div>
          </Section>

          {/* Teacher Progress Bar Graph Section (Fixed Text Clipping Glitch) */}
          {analytics?.teacherProgress && analytics.teacherProgress.length > 0 && (
            <Section title="Faculty Distribution Matrix" icon={Users}>
              <div className="h-64 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.teacherProgress}
                    layout="vertical"
                    margin={{ top: 5, right: 15, left: 35, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 10 }}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#334155', fontSize: 11, fontWeight: 600 }}
                      width={115} // Widened boundaries prevent single name characters from clipping on wrap lines
                    />
                    <Tooltip formatter={(value) => [`${value}%`, 'Completed Syllabus']} />
                    <Bar
                      dataKey="progress"
                      radius={[0, 4, 4, 0]}
                      barSize={14}
                      animationDuration={1200}
                    >
                      {analytics.teacherProgress.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[(index + 3) % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
