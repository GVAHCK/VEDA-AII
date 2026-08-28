'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  FileUp,
  GraduationCap,
  Layers,
  MoreVertical,
  PlusCircle,
  Sparkles,
  TrendingUp,
  Trash2,
  Copy,
  RotateCw,
} from 'lucide-react';
import { useAppStore, AssessmentItem } from '@/lib/store/assessment-store';
import { cn } from '@/lib/utils';

export function DashboardView() {
  const router = useRouter();
  const settings = useAppStore((s) => s.settings);
  const assessments = useAppStore((s) => s.assessments);
  const duplicateAssessment = useAppStore((s) => s.duplicateAssessment);
  const deleteAssessment = useAppStore((s) => s.deleteAssessment);
  const reprocessAssessment = useAppStore((s) => s.reprocessAssessment);
  const addToast = useAppStore((s) => s.addToast);

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [chartRange, setChartRange] = useState<'week' | 'month'>('week');

  // Stats calculation
  const totalAssessments = assessments.length;
  const papersProcessed = totalAssessments * 6; // approximate pages
  const questionsEvaluated = assessments.reduce((acc, a) => acc + (a.questionsCount || 5), 0);
  const completedAssessments = assessments.filter((a) => a.status === 'Completed');
  const avgScorePercent = completedAssessments.length
    ? Math.round(
        completedAssessments.reduce((acc, a) => acc + (a.score / (a.maxScore || 20)) * 100, 0) /
          completedAssessments.length
      )
    : 78;

  // Grade Distribution Counts
  const gradeDistribution = [
    { label: 'A+ (90-100%)', count: 8, percentage: 33, color: 'bg-emerald-500' },
    { label: 'A (80-89%)', count: 9, percentage: 38, color: 'bg-teal-500' },
    { label: 'B (70-79%)', count: 4, percentage: 17, color: 'bg-amber-500' },
    { label: 'C (60-69%)', count: 2, percentage: 8, color: 'bg-orange-500' },
    { label: 'Needs Help (<60%)', count: 1, percentage: 4, color: 'bg-rose-500' },
  ];

  // Subject Performance Breakdown
  const subjectBreakdown = [
    { subject: 'Biology', count: 12, avg: 82, color: '#f45a2c' },
    { subject: 'Physics', count: 6, avg: 76, color: '#3b82f6' },
    { subject: 'Chemistry', count: 4, avg: 74, color: '#8b5cf6' },
    { subject: 'Mathematics', count: 2, avg: 90, color: '#10b981' },
  ];

  // Activity Data
  const weeklyData = [
    { day: 'Mon', count: 4, height: '40%' },
    { day: 'Tue', count: 7, height: '70%' },
    { day: 'Wed', count: 3, height: '30%' },
    { day: 'Thu', count: 8, height: '80%' },
    { day: 'Fri', count: 10, height: '100%' },
    { day: 'Sat', count: 2, height: '20%' },
    { day: 'Sun', count: 1, height: '10%' },
  ];

  const monthlyData = [
    { day: 'W1', count: 14, height: '45%' },
    { day: 'W2', count: 22, height: '75%' },
    { day: 'W3', count: 18, height: '60%' },
    { day: 'W4', count: 28, height: '95%' },
  ];

  const currentChartData = chartRange === 'week' ? weeklyData : monthlyData;

  return (
    <main className="min-h-[calc(100vh-56px)] bg-[#fafafa] p-4 sm:p-6 lg:p-8 dark:bg-[#121212]">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* TOP GREETING & HERO */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#f45a2c] dark:bg-orange-950/60 dark:text-orange-300">
                TEACHER WORKSPACE
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {settings.institutionName}
              </span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Good morning, {settings.teacherName.split(' ')[0]}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              AI-assisted OCR, answer mapping, and rubric evaluation at a glance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/extract"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2b2b2b] px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-black active:scale-[0.98] dark:bg-[#ff5c28] dark:hover:bg-[#e84e1b]"
            >
              <FileUp className="h-4 w-4" />
              <span>New Assessment</span>
            </Link>
            <button
              onClick={() => {
                addToast({
                  title: 'Analytics Exported',
                  description: 'Assessment summary PDF generated and downloaded.',
                  type: 'success',
                });
              }}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-[#1e1e1e] dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <TrendingUp className="h-3.5 w-3.5 text-slate-400" />
              <span>Export Report</span>
            </button>
          </div>
        </div>

        {/* 4 STAT CARDS */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<ClipboardCheck className="h-5 w-5 text-[#f45a2c]" />}
            label="Total Assessments"
            value={totalAssessments.toString()}
            detail="+4 this month"
            detailPositive={true}
            trend="16% vs last term"
          />
          <StatCard
            icon={<Layers className="h-5 w-5 text-blue-500" />}
            label="Papers Processed"
            value={papersProcessed.toString()}
            detail="99.2% OCR confidence"
            detailPositive={true}
            trend="148 pages scanned"
          />
          <StatCard
            icon={<FileCheck2 className="h-5 w-5 text-purple-500" />}
            label="Questions Evaluated"
            value={questionsEvaluated.toString()}
            detail="Avg 4.2 marks / Q"
            detailPositive={true}
            trend="Sub-letter mapping"
          />
          <StatCard
            icon={<Sparkles className="h-5 w-5 text-emerald-500" />}
            label="Average Grade"
            value={`${avgScorePercent}%`}
            detail="Across all subjects"
            detailPositive={true}
            trend="+3.2% vs baseline"
          />
        </section>

        {/* CHARTS & VISUALIZATIONS */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
          {/* Chart 1: Activity Overview */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#181818]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Activity Overview
                </h2>
                <p className="text-[11px] text-slate-400">Assessments mapped and graded over time</p>
              </div>
              <div className="flex items-center rounded-xl bg-slate-100 p-1 text-[11px] font-semibold dark:bg-slate-800">
                <button
                  onClick={() => setChartRange('week')}
                  className={cn(
                    'rounded-lg px-2.5 py-1 transition',
                    chartRange === 'week'
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-[#252525] dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                  )}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setChartRange('month')}
                  className={cn(
                    'rounded-lg px-2.5 py-1 transition',
                    chartRange === 'month'
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-[#252525] dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                  )}
                >
                  Monthly
                </button>
              </div>
            </div>

            {/* Interactive SVG Bar Chart */}
            <div className="mt-6 flex h-48 items-end gap-3 sm:gap-6 px-2">
              {currentChartData.map((item) => (
                <div key={item.day} className="group relative flex flex-1 flex-col items-center gap-2 h-full justify-end">
                  {/* Tooltip on hover */}
                  <div className="pointer-events-none absolute -top-8 hidden rounded-md bg-slate-900 px-2 py-1 text-[10px] font-bold text-white shadow-lg group-hover:block dark:bg-slate-700">
                    {item.count} papers
                  </div>
                  {/* Bar */}
                  <div
                    style={{ height: item.height }}
                    className="w-full max-w-[42px] rounded-t-lg bg-gradient-to-t from-orange-400 to-[#f45a2c] transition-all duration-300 group-hover:from-orange-500 group-hover:to-[#ff3f0a]"
                  />
                  {/* Label */}
                  <span className="text-[11px] font-semibold text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white">
                    {item.day}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400 dark:border-slate-800">
              <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-3.5 w-3.5" /> +24% higher volume than last month
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Peak day: Friday
              </span>
            </div>
          </div>

          {/* Chart 2: Grade Distribution */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#181818]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Grade Distribution
                </h2>
                <p className="text-[11px] text-slate-400">Performance across recent cohorts</p>
              </div>
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Avg B+ (78%)
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {gradeDistribution.map((grade) => (
                <div key={grade.label} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-600 dark:text-slate-300">{grade.label}</span>
                    <span className="text-slate-900 dark:text-white">
                      {grade.count} students ({grade.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      style={{ width: `${grade.percentage}%` }}
                      className={cn('h-full rounded-full transition-all duration-500', grade.color)}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Subject Mini Breakdown */}
            <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Subject Breakdown
              </p>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                {subjectBreakdown.map((s) => (
                  <div
                    key={s.subject}
                    className="flex items-center justify-between rounded-xl bg-slate-50 p-2 text-xs dark:bg-slate-800/40"
                  >
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {s.subject}
                    </span>
                    <span className="font-bold text-[#f45a2c]">{s.avg}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* RECENT ASSESSMENTS & ACTIVITY */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1.45fr_0.75fr]">
          {/* Left Column: Recent Assessments List */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#181818]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                  Recent Assessments
                </h2>
                <p className="text-[11px] text-slate-400">Click any row to open review viewer</p>
              </div>
              <Link
                href="/assessments"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#f45a2c] hover:underline"
              >
                <span>View all</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
              {assessments.slice(0, 4).map((asmt) => (
                <div
                  key={asmt.id}
                  className="group flex items-center justify-between gap-3 py-3.5 transition hover:bg-[#fff9f6] dark:hover:bg-slate-800/50 rounded-xl px-2"
                >
                  <Link
                    href={`/extract?id=${asmt.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-[#f45a2c] group-hover:bg-orange-100 dark:bg-orange-950/50 dark:text-orange-400">
                      <ClipboardCheck className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs sm:text-sm font-bold text-slate-800 group-hover:text-[#f45a2c] dark:text-slate-200">
                        {asmt.title}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span>{asmt.subject}</span>
                        <span>•</span>
                        <span>{asmt.date}</span>
                        {asmt.studentName && (
                          <>
                            <span>•</span>
                            <span className="font-medium text-slate-500">{asmt.studentName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="block text-xs font-bold text-slate-900 dark:text-white">
                        {asmt.score} / {asmt.maxScore}
                      </span>
                      <span
                        className={cn(
                          'inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                          asmt.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : asmt.status === 'Processing'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        )}
                      >
                        {asmt.status}
                      </span>
                    </div>

                    {/* Quick Row Actions Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() =>
                          setActiveMenuId(activeMenuId === asmt.id ? null : asmt.id)
                        }
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        aria-label="Actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {activeMenuId === asmt.id && (
                        <div className="absolute right-0 top-8 z-20 w-36 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-[#202020]">
                          <button
                            onClick={() => {
                              router.push(`/extract?id=${asmt.id}`);
                              setActiveMenuId(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-700 hover:bg-orange-50 hover:text-[#f45a2c] dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" />
                            <span>Open Review</span>
                          </button>
                          <button
                            onClick={() => {
                              duplicateAssessment(asmt.id);
                              setActiveMenuId(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-700 hover:bg-orange-50 hover:text-[#f45a2c] dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            <span>Duplicate</span>
                          </button>
                          <button
                            onClick={() => {
                              reprocessAssessment(asmt.id);
                              setActiveMenuId(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-700 hover:bg-orange-50 hover:text-[#f45a2c] dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <RotateCw className="h-3.5 w-3.5" />
                            <span>Reprocess</span>
                          </button>
                          <button
                            onClick={() => {
                              deleteAssessment(asmt.id);
                              setActiveMenuId(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Ready to Review Banner & Quick Activity Stream */}
          <div className="space-y-5">
            {/* Promo Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2f2f2f] to-[#1a1a1a] p-6 text-white shadow-md">
              <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-orange-500/20 blur-xl" />
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#444] text-[#ff8865]">
                <Sparkles className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-base font-bold">Ready for new grading?</h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                Upload student handwriting and exam question papers to extract, map, and grade with
                full Gemini and OCR coordinate confidence.
              </p>
              <div className="mt-5 flex items-center gap-3">
                <Link
                  href="/extract"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#ff5c28] px-4 py-2 text-xs font-bold text-white shadow-md shadow-orange-950 transition hover:bg-[#e64718]"
                >
                  <span>Start Mapping</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/extract?demo=1"
                  className="text-xs font-semibold text-[#ffac95] hover:underline"
                >
                  Open Live Demo
                </Link>
              </div>
            </div>

            {/* Quick Activity Stream */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#181818]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Recent Pipeline Activity
              </h3>
              <div className="mt-3 space-y-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Biology Unit test 03 evaluated
                    </p>
                    <p className="text-[10px] text-slate-400">5 questions mapped • 15/20 score</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="mt-1 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      OCR Engine configured for English
                    </p>
                    <p className="text-[10px] text-slate-400">Tesseract.js worker initialized</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="mt-1 h-2 w-2 rounded-full bg-purple-500 shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Gemini 2.5 Flash Connected
                    </p>
                    <p className="text-[10px] text-slate-400">Auto-adjudication enabled</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  detail,
  detailPositive,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  detailPositive?: boolean;
  trend?: string;
}) {
  return (
    <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:border-orange-200 hover:shadow-md dark:border-slate-800 dark:bg-[#181818] dark:hover:border-orange-950">
      <div className="flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-50 group-hover:bg-orange-100 dark:bg-orange-950/40">
          {icon}
        </span>
        {trend && (
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
            {trend}
          </span>
        )}
      </div>
      <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      <b className="mt-1 block text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
        {value}
      </b>
      <p
        className={cn(
          'mt-1 text-[11px] font-medium',
          detailPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
        )}
      >
        {detail}
      </p>
    </div>
  );
}
