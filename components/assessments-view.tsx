'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowUpRight,
  ChevronRight,
  ClipboardCheck,
  Copy,
  Edit2,
  FileUp,
  Filter,
  Grid,
  List,
  MoreVertical,
  Plus,
  RotateCw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
  Sparkles,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useAppStore, AssessmentItem } from '@/lib/store/assessment-store';
import { cn } from '@/lib/utils';

export function AssessmentsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('search') ?? '';

  const assessments = useAppStore((s) => s.assessments);
  const updateAssessment = useAppStore((s) => s.updateAssessment);
  const deleteAssessment = useAppStore((s) => s.deleteAssessment);
  const duplicateAssessment = useAppStore((s) => s.duplicateAssessment);
  const reprocessAssessment = useAppStore((s) => s.reprocessAssessment);
  const addToast = useAppStore((s) => s.addToast);

  // Filter & Search state
  const [query, setQuery] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [sortField, setSortField] = useState<'newest' | 'oldest' | 'score' | 'name' | 'questions'>('newest');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Modals & Action Menu State
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [renameItem, setRenameItem] = useState<{ id: string; title: string } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Filtered & Sorted Assessments
  const filteredAssessments = useMemo(() => {
    return assessments
      .filter((item) => {
        const matchesQuery =
          !query.trim() ||
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.subject.toLowerCase().includes(query.toLowerCase()) ||
          (item.studentName && item.studentName.toLowerCase().includes(query.toLowerCase()));

        const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
        const matchesSubject = subjectFilter === 'All' || item.subject === subjectFilter;

        return matchesQuery && matchesStatus && matchesSubject;
      })
      .sort((a, b) => {
        if (sortField === 'newest') return (b.timestamp || 0) - (a.timestamp || 0);
        if (sortField === 'oldest') return (a.timestamp || 0) - (b.timestamp || 0);
        if (sortField === 'score') return b.score / (b.maxScore || 1) - a.score / (a.maxScore || 1);
        if (sortField === 'name') return a.title.localeCompare(b.title);
        if (sortField === 'questions') return (b.questionsCount || 0) - (a.questionsCount || 0);
        return 0;
      });
  }, [assessments, query, statusFilter, subjectFilter, sortField]);

  // Unique subjects
  const subjects = useMemo(() => {
    const list = Array.from(new Set(assessments.map((a) => a.subject)));
    return ['All', ...list];
  }, [assessments]);

  return (
    <main className="min-h-[calc(100vh-56px)] bg-[#fafafa] p-4 sm:p-6 lg:p-8 dark:bg-[#121212]">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* PAGE HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Assessment Management
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Manage, search, review, duplicate, and re-evaluate student answer sheets.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/extract"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2b2b2b] px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-black active:scale-[0.98] dark:bg-[#ff5c28] dark:hover:bg-[#e84e1b]"
            >
              <Plus className="h-4 w-4" />
              <span>New Assessment</span>
            </Link>
          </div>
        </div>

        {/* SUMMARY STATS BAR */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-[#181818]">
            <p className="text-[11px] font-semibold text-slate-400">Total Listed</p>
            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
              {assessments.length}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-[#181818]">
            <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              Completed
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
              {assessments.filter((a) => a.status === 'Completed').length}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-[#181818]">
            <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">In Draft</p>
            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
              {assessments.filter((a) => a.status === 'Draft').length}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-[#181818]">
            <p className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
              Avg Questions
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
              {assessments.length
                ? Math.round(
                    assessments.reduce((acc, a) => acc + (a.questionsCount || 5), 0) /
                      assessments.length
                  )
                : 0}
            </p>
          </div>
        </div>

        {/* SEARCH, FILTER & SORT TOOLBAR */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-[#181818] lg:flex-row lg:items-center lg:justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, subject, or student name..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-xs text-slate-900 outline-none transition focus:border-[#f45a2c] focus:bg-white focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-white dark:focus:border-orange-500 dark:focus:bg-[#202020] dark:focus:ring-orange-950"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filters & Sort Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none transition hover:bg-slate-100 focus:border-[#f45a2c] dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
            >
              <option value="All">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Processing">Processing</option>
              <option value="Draft">Draft</option>
              <option value="Failed">Failed</option>
            </select>

            {/* Subject Filter */}
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none transition hover:bg-slate-100 focus:border-[#f45a2c] dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
            >
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s === 'All' ? 'All Subjects' : s}
                </option>
              ))}
            </select>

            {/* Sort Options */}
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as any)}
              className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none transition hover:bg-slate-100 focus:border-[#f45a2c] dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="score">Sort: Highest Score</option>
              <option value="name">Sort: Name (A-Z)</option>
              <option value="questions">Sort: Question Count</option>
            </select>

            {/* View Mode Switcher */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/60">
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  'rounded-lg p-1.5 transition',
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-[#252525] dark:text-white'
                    : 'text-slate-400 hover:text-slate-600'
                )}
                aria-label="Table view"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'rounded-lg p-1.5 transition',
                  viewMode === 'grid'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-[#252525] dark:text-white'
                    : 'text-slate-400 hover:text-slate-600'
                )}
                aria-label="Grid view"
              >
                <Grid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* RESULTS SECTION */}
        {filteredAssessments.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-[#181818]">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-50 text-[#f45a2c] dark:bg-orange-950/50 dark:text-orange-400">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
              No matching assessments found
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm">
              We couldn&apos;t find any records matching your search &apos;{query}&apos; or filter
              criteria. Try resetting filters or upload a new assessment.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => {
                  setQuery('');
                  setStatusFilter('All');
                  setSubjectFilter('All');
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Reset Filters
              </button>
              <Link
                href="/extract"
                className="rounded-xl bg-[#ff5c28] px-4 py-2 text-xs font-bold text-white hover:bg-[#e64718]"
              >
                Upload New
              </Link>
            </div>
          </div>
        ) : viewMode === 'table' ? (
          /* TABLE VIEW */
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-[#181818]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                    <th className="px-5 py-3.5">Assessment Details</th>
                    <th className="px-4 py-3.5">Subject</th>
                    <th className="px-4 py-3.5">Date Added</th>
                    <th className="px-4 py-3.5 text-center">Questions</th>
                    <th className="px-4 py-3.5">Score</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAssessments.map((asmt) => (
                    <tr
                      key={asmt.id}
                      className="group transition hover:bg-[#fff9f6] dark:hover:bg-slate-800/50"
                    >
                      {/* Title & Student */}
                      <td className="px-5 py-4">
                        <Link
                          href={`/extract?id=${asmt.id}`}
                          className="flex items-center gap-3 font-bold text-slate-800 group-hover:text-[#f45a2c] dark:text-slate-200"
                        >
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-orange-50 text-[#f45a2c] dark:bg-orange-950 dark:text-orange-400">
                            <ClipboardCheck className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="text-xs sm:text-sm font-bold leading-snug">
                              {asmt.title}
                            </p>
                            {asmt.studentName && (
                              <p className="text-[11px] font-normal text-slate-400">
                                Student: {asmt.studentName}
                              </p>
                            )}
                          </div>
                        </Link>
                      </td>

                      {/* Subject */}
                      <td className="px-4 py-4">
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {asmt.subject}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-4 text-slate-500 dark:text-slate-400">
                        {asmt.date}
                      </td>

                      {/* Questions Count */}
                      <td className="px-4 py-4 text-center font-semibold text-slate-700 dark:text-slate-300">
                        {asmt.questionsCount || 5} Qs
                      </td>

                      {/* Score */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {asmt.score} / {asmt.maxScore}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({Math.round((asmt.score / (asmt.maxScore || 1)) * 100)}%)
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                            asmt.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : asmt.status === 'Processing'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : asmt.status === 'Failed'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          )}
                        >
                          {asmt.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/extract?id=${asmt.id}`}
                            className="inline-flex h-8 items-center gap-1 rounded-lg bg-orange-50 px-2.5 text-xs font-semibold text-[#f45a2c] hover:bg-[#f45a2c] hover:text-white dark:bg-orange-950/60 dark:text-orange-300 transition"
                            title="Open Assessment Review"
                          >
                            <span>Open</span>
                            <ArrowUpRight className="h-3 w-3" />
                          </Link>

                          <div className="relative">
                            <button
                              onClick={() =>
                                setActiveMenuId(activeMenuId === asmt.id ? null : asmt.id)
                              }
                              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                              aria-label="More actions"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {activeMenuId === asmt.id && (
                              <div className="absolute right-0 top-9 z-20 w-36 rounded-xl border border-slate-200 bg-white p-1.5 text-left shadow-xl dark:border-slate-700 dark:bg-[#202020]">
                                <button
                                  onClick={() => {
                                    setRenameItem({ id: asmt.id, title: asmt.title });
                                    setActiveMenuId(null);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-orange-50 hover:text-[#f45a2c] dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                  <span>Rename</span>
                                </button>
                                <button
                                  onClick={() => {
                                    duplicateAssessment(asmt.id);
                                    setActiveMenuId(null);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-orange-50 hover:text-[#f45a2c] dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                  <span>Duplicate</span>
                                </button>
                                <button
                                  onClick={() => {
                                    reprocessAssessment(asmt.id);
                                    setActiveMenuId(null);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-orange-50 hover:text-[#f45a2c] dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                  <RotateCw className="h-3.5 w-3.5" />
                                  <span>Reprocess</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setDeleteId(asmt.id);
                                    setActiveMenuId(null);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* GRID VIEW */
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAssessments.map((asmt) => (
              <div
                key={asmt.id}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-orange-200 hover:shadow-md dark:border-slate-800 dark:bg-[#181818]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#f45a2c] dark:bg-orange-950 dark:text-orange-300">
                      {asmt.subject}
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                        asmt.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      )}
                    >
                      {asmt.status}
                    </span>
                  </div>

                  <h3 className="mt-3 text-sm font-bold text-slate-900 group-hover:text-[#f45a2c] dark:text-white">
                    {asmt.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">{asmt.date}</p>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {asmt.score} / {asmt.maxScore}
                      </span>
                      <span className="ml-1 text-[10px] text-slate-400">
                        ({asmt.questionsCount || 5} Qs)
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => duplicateAssessment(asmt.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                        title="Duplicate"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteId(asmt.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <Link
                        href={`/extract?id=${asmt.id}`}
                        className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#2b2b2b] px-3 text-xs font-semibold text-white hover:bg-black dark:bg-[#ff5c28] dark:hover:bg-[#e64718]"
                      >
                        <span>Open</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RENAME MODAL */}
        {renameItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setRenameItem(null)}
            />
            <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-[#1e1e1e]">
              <h3 className="text-base font-bold">Rename Assessment</h3>
              <div className="mt-4">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Assessment Title
                </label>
                <input
                  type="text"
                  value={renameItem.title}
                  onChange={(e) => setRenameItem({ ...renameItem, title: e.target.value })}
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-[#f45a2c] focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setRenameItem(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    updateAssessment(renameItem.id, { title: renameItem.title });
                    setRenameItem(null);
                  }}
                  className="rounded-xl bg-[#ff5c28] px-4 py-2 text-xs font-semibold text-white hover:bg-[#e64718]"
                >
                  Save Title
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE MODAL */}
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setDeleteId(null)}
            />
            <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-[#1e1e1e]">
              <h3 className="text-base font-bold text-rose-600">Delete Assessment?</h3>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                This action will permanently remove this assessment and its extracted OCR results.
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setDeleteId(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    deleteAssessment(deleteId);
                    setDeleteId(null);
                  }}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
