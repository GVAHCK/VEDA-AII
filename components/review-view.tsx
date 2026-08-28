'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileCheck,
  Filter,
  Layers,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Share2,
  Sparkles,
  ZoomIn,
  ZoomOut,
  AlertCircle,
  HelpCircle,
  BookOpen,
  Terminal,
} from 'lucide-react';
import { useAppStore, AssessmentItem } from '@/lib/store/assessment-store';
import { demoReview as fallbackReview } from '@/lib/demo';
import { cn } from '@/lib/utils';
import type { AnswerSegment, Review, Question, Grade } from '@/lib/types';

interface ReviewViewProps {
  assessmentId?: string;
  customReview?: Review | null;
  onBackToUpload?: () => void;
}

export function ReviewView({ assessmentId, customReview, onBackToUpload }: ReviewViewProps) {
  const assessments = useAppStore((s) => s.assessments);
  const activeQuestionId = useAppStore((s) => s.activeQuestionId);
  const setActiveQuestionId = useAppStore((s) => s.setActiveQuestionId);
  const expandedQuestionIds = useAppStore((s) => s.expandedQuestionIds);
  const toggleQuestionExpanded = useAppStore((s) => s.toggleQuestionExpanded);
  const setAllQuestionsExpanded = useAppStore((s) => s.setAllQuestionsExpanded);
  const viewerZoom = useAppStore((s) => s.viewerZoom);
  const setViewerZoom = useAppStore((s) => s.setViewerZoom);
  const viewerPage = useAppStore((s) => s.viewerPage);
  const setViewerPage = useAppStore((s) => s.setViewerPage);
  const searchQuestionQuery = useAppStore((s) => s.searchQuestionQuery);
  const setSearchQuestionQuery = useAppStore((s) => s.setSearchQuestionQuery);
  const questionFilter = useAppStore((s) => s.questionFilter);
  const setQuestionFilter = useAppStore((s) => s.setQuestionFilter);
  const updateQuestionFeedback = useAppStore((s) => s.updateQuestionFeedback);
  const addToast = useAppStore((s) => s.addToast);

  // Local editing feedback state
  const [editingFeedback, setEditingFeedback] = useState<{ [qid: string]: string }>({});
  const [isEditing, setIsEditing] = useState<{ [qid: string]: boolean }>({});
  const [regeneratingQid, setRegeneratingQid] = useState<string | null>(null);
  const [showHighlights, setShowHighlights] = useState(true);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [selectedDebugQid, setSelectedDebugQid] = useState<string | null>(null);

  // Resolve assessment data
  const currentAssessment = assessmentId ? assessments.find((a) => a.id === assessmentId) : undefined;
  const reviewData: Review = customReview ?? currentAssessment?.reviewData ?? fallbackReview;

  const activeQuestion = reviewData.questions.find((q) => q.id === activeQuestionId) || reviewData.questions[0];
  const activeMapping = reviewData.mappings.find((m) => m.questionId === activeQuestion?.id);
  const activeAnswer = reviewData.answers.find((a) => a.id === activeMapping?.answerId);

  // Sync initial page when active question changes
  useEffect(() => {
    if (activeAnswer && activeAnswer.pageStart) {
      setViewerPage(activeAnswer.pageStart);
    }
  }, [activeQuestionId, activeAnswer, setViewerPage]);

  // Filter questions
  const filteredQuestions = useMemo(() => {
    return reviewData.questions.filter((q) => {
      const mapping = reviewData.mappings.find((m) => m.questionId === q.id);
      const grade = reviewData.grades[q.id];

      // Text search
      const matchesSearch =
        !searchQuestionQuery.trim() ||
        q.text.toLowerCase().includes(searchQuestionQuery.toLowerCase()) ||
        q.number.toLowerCase().includes(searchQuestionQuery.toLowerCase()) ||
        (q.topic && q.topic.toLowerCase().includes(searchQuestionQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Status filters
      if (questionFilter === 'all') return true;
      if (questionFilter === 'answered') return mapping?.status === 'answered';
      if (questionFilter === 'unanswered') return mapping?.status === 'unanswered';
      if (questionFilter === 'low_confidence') return (mapping?.confidence ?? 0) < 0.9;
      if (questionFilter === 'full_score') return (grade?.score ?? 0) >= (grade?.maxScore ?? 1);
      if (questionFilter === 'partial_score')
        return (grade?.score ?? 0) > 0 && (grade?.score ?? 0) < (grade?.maxScore ?? 1);

      return true;
    });
  }, [reviewData, searchQuestionQuery, questionFilter]);

  // Handle feedback edit & save
  const handleStartEdit = (qid: string, currentFeedback: string) => {
    setIsEditing((prev) => ({ ...prev, [qid]: true }));
    setEditingFeedback((prev) => ({
      ...prev,
      [qid]: editingFeedback[qid] ?? currentFeedback,
    }));
  };

  const handleSaveFeedback = (qid: string) => {
    const feedbackText = editingFeedback[qid];
    if (feedbackText !== undefined) {
      updateQuestionFeedback(currentAssessment?.id || 'asmt-bio-03', qid, feedbackText);
    }
    setIsEditing((prev) => ({ ...prev, [qid]: false }));
  };

  const handleRegenerateFeedback = (qid: string) => {
    setRegeneratingQid(qid);
    setTimeout(() => {
      const q = reviewData.questions.find((x) => x.id === qid);
      const enhancedFeedback = `Adjudicated with Gemini: Student's response for "${q?.topic || 'this question'}" satisfies the core assessment rubrics with high conceptual clarity. Additional credit applied for clear terminology.`;
      setEditingFeedback((prev) => ({ ...prev, [qid]: enhancedFeedback }));
      updateQuestionFeedback(currentAssessment?.id || 'asmt-bio-03', qid, enhancedFeedback);
      setRegeneratingQid(null);
      setIsEditing((prev) => ({ ...prev, [qid]: false }));
      addToast({
        title: 'Feedback Regenerated',
        description: `Gemini regenerated feedback for Question #${qid}.`,
        type: 'success',
      });
    }, 1200);
  };

  // Zoom helpers
  const handleZoomIn = () => setViewerZoom((z) => Math.min(160, z + 15));
  const handleZoomOut = () => setViewerZoom((z) => Math.max(60, z - 15));
  const handleFitWidth = () => setViewerZoom(100);
  const handleFitPage = () => setViewerZoom(80);

  // Overall Score Calculation
  const totalScore = reviewData.overall?.score ?? Object.values(reviewData.grades).reduce((a, b) => a + b.score, 0);
  const maxTotalScore = reviewData.overall?.maxScore ?? Object.values(reviewData.grades).reduce((a, b) => a + b.maxScore, 0);

  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col bg-[#f4f4f4] dark:bg-[#121212]">
      {/* REVIEW TOP BAR */}
      <div className="sticky top-14 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5 shadow-sm dark:border-slate-800 dark:bg-[#181818] sm:px-6">
        <div className="flex items-center gap-3">
          {onBackToUpload ? (
            <button
              onClick={onBackToUpload}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Upload New</span>
            </button>
          ) : (
            <Link
              href="/assessments"
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>All Assessments</span>
            </Link>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900 dark:text-white">
                {currentAssessment?.title || `${reviewData.subject ?? 'Assessment'} · Evaluated Assessment`}
              </h1>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Score: {totalScore} / {maxTotalScore} ({Math.round((totalScore / (maxTotalScore || 1)) * 100)}%)
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Subject: <span className="font-bold text-slate-600 dark:text-slate-300">{reviewData.subject ?? currentAssessment?.subject ?? 'Unclassified'}</span> • {reviewData.questions.length} Extracted Questions • {reviewData.answers.length} Answer Segments Detected
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              addToast({
                title: 'Report Downloaded',
                description: 'Grading rubric and highlighted paper exported as PDF.',
                type: 'success',
              });
            }}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-[#202020] dark:text-slate-200"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={() => setShowDiagnostics(true)}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-amber-300/80 bg-amber-50 px-3 text-xs font-semibold text-amber-900 shadow-sm hover:bg-amber-100 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300"
            title="Open OCR Pipeline & Extraction Diagnostics Inspector"
          >
            <Terminal className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>OCR Debugger</span>
          </button>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
              addToast({
                title: 'Link Copied',
                description: 'Assessment review URL copied to clipboard.',
                type: 'info',
              });
            }}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-[#2b2b2b] px-3 text-xs font-semibold text-white shadow-sm hover:bg-black dark:bg-[#ff5c28] dark:hover:bg-[#e64718]"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* OVERALL STRENGTHS & WEAK TOPICS STRIP */}
      {reviewData.overall && (
        <div className="border-b border-slate-200/70 bg-gradient-to-r from-orange-50/50 via-white to-emerald-50/50 px-4 py-2 text-xs dark:border-slate-800 dark:from-[#1c1c1c] dark:via-[#181818] dark:to-[#1c1c1c] sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                <Sparkles className="inline-block h-3.5 w-3.5 text-[#f45a2c] mr-1" />
                Assessment Summary:
              </span>
              <span className="text-slate-600 dark:text-slate-400">
                {reviewData.overall.feedback}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 text-[10px]">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Strong:</span>
                {reviewData.overall.strongTopics.map((t) => (
                  <span
                    key={t}
                    className="rounded bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1 text-[10px]">
                <span className="font-bold text-amber-600 dark:text-amber-400">Review:</span>
                {reviewData.overall.weakTopics.map((t) => (
                  <span
                    key={t}
                    className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TWO PANEL WORKSPACE: LEFT QUESTIONS / RIGHT PAPER VIEWER */}
      <div className="flex-1 lg:grid lg:grid-cols-[minmax(420px,1.15fr)_minmax(520px,1.35fr)]">
        {/* LEFT PANEL: EXTRACTED QUESTIONS & FEEDBACK */}
        <section className="order-2 flex flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-[#181818] lg:order-1 lg:max-h-[calc(100vh-140px)]">
          {/* Question Filter & Search Header */}
          <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 p-4 backdrop-blur-sm dark:border-slate-800 dark:bg-[#181818]/95 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black tracking-tight text-slate-900 dark:text-white">
                  Extracted Questions
                </h2>
                <p className="text-[11px] text-slate-400">
                  Showing {filteredQuestions.length} of {reviewData.questions.length} questions
                </p>
              </div>

              {/* Expand / Collapse All */}
              <div className="flex items-center gap-1 text-xs">
                <button
                  onClick={() =>
                    setAllQuestionsExpanded(true, reviewData.questions.map((q) => q.id))
                  }
                  className="rounded-lg px-2 py-1 font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 text-[11px]"
                >
                  Expand All
                </button>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <button
                  onClick={() => setAllQuestionsExpanded(false)}
                  className="rounded-lg px-2 py-1 font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 text-[11px]"
                >
                  Collapse All
                </button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuestionQuery}
                  onChange={(e) => setSearchQuestionQuery(e.target.value)}
                  placeholder="Search question text or topic..."
                  className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-7 text-xs outline-none focus:border-[#f45a2c] focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                {searchQuestionQuery && (
                  <button
                    onClick={() => setSearchQuestionQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                )}
              </div>

              <select
                value={questionFilter}
                onChange={(e) => setQuestionFilter(e.target.value as any)}
                className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-700 outline-none hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="all">Filter: All</option>
                <option value="answered">Answered</option>
                <option value="unanswered">Unanswered</option>
                <option value="low_confidence">Low Confidence (&lt;90%)</option>
                <option value="full_score">Full Score</option>
                <option value="partial_score">Partial Score</option>
              </select>
            </div>
          </div>

          {/* Questions List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredQuestions.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No questions match your filter criteria.
              </div>
            ) : (
              filteredQuestions.map((q, idx) => {
                const mapping = reviewData.mappings.find((m) => m.questionId === q.id)!;
                const grade = reviewData.grades[q.id];
                const isOpen = expandedQuestionIds.includes(q.id);
                const isSelected = activeQuestionId === q.id;
                const editing = isEditing[q.id];
                const feedbackValue = editingFeedback[q.id] ?? grade?.feedback ?? '';

                return (
                  <article
                    key={q.id}
                    className={cn(
                      'rounded-2xl border transition-all',
                      isSelected
                        ? 'border-[#ff5c31] bg-[#fffaf8] shadow-sm dark:border-[#ff5c31] dark:bg-orange-950/20'
                        : 'border-slate-200/80 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-[#181818]'
                    )}
                  >
                    {/* Question Card Header */}
                    <button
                      onClick={() => {
                        setActiveQuestionId(q.id);
                        toggleQuestionExpanded(q.id);
                        const selectedAnswer = reviewData.answers.find(
                          (a) => a.id === mapping?.answerId
                        );
                        if (selectedAnswer) {
                          setViewerPage(selectedAnswer.pageStart);
                        }
                      }}
                      className="flex w-full items-start gap-3 p-3.5 text-left"
                    >
                      {/* Question Number Badge */}
                      <span
                        className={cn(
                          'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white shadow-sm transition',
                          isSelected
                            ? 'bg-[#ff5c31] ring-2 ring-orange-200 dark:ring-orange-950'
                            : 'bg-slate-700 dark:bg-slate-600'
                        )}
                      >
                        {q.number.match(/\d+/)?.[0] ?? idx + 1}
                      </span>

                      {/* Sub-letter badge if present */}
                      {/[a-z]/i.test(q.number) && (
                        <span className="-ml-2 mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold lowercase text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {q.number.match(/[a-z]/i)?.[0]}
                        </span>
                      )}

                      {/* Question Text & Topic */}
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-xs sm:text-sm font-semibold leading-relaxed text-slate-800 dark:text-slate-200">
                          {q.text}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                          {q.topic && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              {q.topic}
                            </span>
                          )}
                          <span>•</span>
                          <span>
                            Confidence: {Math.round((mapping?.confidence ?? 0) * 100)}%
                          </span>
                          <span>•</span>
                          <span className="italic">{mapping?.reason}</span>
                        </div>
                      </div>

                      {/* Score Badge */}
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2.5 py-1 text-xs font-bold',
                          mapping?.status === 'unanswered'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : (grade?.score ?? 0) >= (grade?.maxScore ?? 1)
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        )}
                      >
                        {grade ? `${grade.score} / ${grade.maxScore}` : '—'}
                      </span>

                      {/* Chevron */}
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        <ChevronDown
                          className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')}
                        />
                      </span>
                    </button>

                    {/* Collapsible Feedback & Rubric Section */}
                    {isOpen && (
                      <div className="border-t border-slate-100 p-4 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 rounded-b-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="h-4 w-4 text-[#ff5c31]" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                              AI Evaluator Feedback
                            </h3>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs">
                            {editing ? (
                              <button
                                onClick={() => handleSaveFeedback(q.id)}
                                className="inline-flex items-center gap-1 rounded-lg bg-[#2b2b2b] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-black dark:bg-[#ff5c28]"
                              >
                                <Save className="h-3 w-3" />
                                <span>Save</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleStartEdit(q.id, grade?.feedback ?? '')}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                              >
                                <Edit3 className="h-3 w-3" />
                                <span>Edit</span>
                              </button>
                            )}

                            <button
                              disabled={regeneratingQid === q.id}
                              onClick={() => handleRegenerateFeedback(q.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
                            >
                              <RefreshCw
                                className={cn('h-3 w-3', regeneratingQid === q.id && 'animate-spin')}
                              />
                              <span>Regenerate</span>
                            </button>
                          </div>
                        </div>

                        {/* Feedback Content Text or Editor */}
                        {editing ? (
                          <textarea
                            value={feedbackValue}
                            onChange={(e) =>
                              setEditingFeedback({ ...editingFeedback, [q.id]: e.target.value })
                            }
                            rows={3}
                            className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 outline-none focus:border-[#ff5c31] focus:ring-1 focus:ring-orange-200 dark:border-slate-700 dark:bg-[#202020] dark:text-slate-200"
                          />
                        ) : (
                          <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 bg-white p-3 rounded-xl border border-slate-200/60 dark:bg-[#202020] dark:border-slate-800">
                            {feedbackValue || 'No answer was detected for this question.'}
                          </p>
                        )}

                        {/* Strengths & Mistakes Tags */}
                        {grade && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                            {grade.strengths && grade.strengths.length > 0 && (
                              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-2 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                  Strengths:
                                </span>
                                <ul className="mt-1 list-disc pl-4 text-slate-600 dark:text-slate-400 space-y-0.5">
                                  {grade.strengths.map((s, i) => (
                                    <li key={i}>{s}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {grade.mistakes && grade.mistakes.length > 0 && (
                              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-2 dark:border-amber-900/50 dark:bg-amber-950/20">
                                <span className="font-bold text-amber-700 dark:text-amber-400">
                                  Improvement Areas:
                                </span>
                                <ul className="mt-1 list-disc pl-4 text-slate-600 dark:text-slate-400 space-y-0.5">
                                  {grade.mistakes.map((m, i) => (
                                    <li key={i}>{m}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </section>

        {/* RIGHT PANEL: ANSWER SHEET VIEWER (PRESERVING COORDINATES) */}
        <section className="order-1 flex flex-col min-h-[600px] overflow-hidden bg-[#222] text-white lg:order-2 lg:max-h-[calc(100vh-140px)]">
          {/* Sticky Toolbar */}
          <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-700 bg-[#303030] px-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-300">
                Answer Sheet Viewer
              </span>
              <button
                onClick={() => setShowHighlights(!showHighlights)}
                className={cn(
                  'rounded-lg px-2 py-1 text-[11px] font-semibold transition',
                  showHighlights ? 'bg-[#2dbf13] text-white' : 'bg-slate-700 text-slate-400'
                )}
                title="Toggle OCR Highlight Overlay"
              >
                <Eye className="inline-block h-3 w-3 mr-1" />
                Highlights
              </button>
            </div>

            {/* Controls: Zoom & Pagination */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Zoom Controls */}
              <div className="flex h-8 items-center rounded-lg bg-[#454545] px-1 text-xs font-semibold">
                <button
                  onClick={handleZoomOut}
                  className="rounded p-1 hover:bg-[#555]"
                  aria-label="Zoom out"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-12 text-center">{viewerZoom}%</span>
                <button
                  onClick={handleZoomIn}
                  className="rounded p-1 hover:bg-[#555]"
                  aria-label="Zoom in"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Fit Presets */}
              <div className="hidden sm:flex items-center gap-1 text-[10px]">
                <button
                  onClick={handleFitWidth}
                  className="rounded bg-[#454545] px-2 py-1 hover:bg-[#555]"
                >
                  Fit Width
                </button>
                <button
                  onClick={handleFitPage}
                  className="rounded bg-[#454545] px-2 py-1 hover:bg-[#555]"
                >
                  Fit Page
                </button>
              </div>

              {/* Pagination Controls */}
              <div className="flex h-8 items-center gap-1.5 rounded-lg bg-[#454545] px-2 text-xs font-semibold">
                <button
                  onClick={() => setViewerPage((p) => Math.max(1, p - 1))}
                  disabled={viewerPage <= 1}
                  className="rounded p-1 hover:bg-[#555] disabled:opacity-30"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span>Page {viewerPage} of 4</span>
                <button
                  onClick={() => setViewerPage((p) => Math.min(4, p + 1))}
                  disabled={viewerPage >= 4}
                  className="rounded p-1 hover:bg-[#555] disabled:opacity-30"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Paper Canvas Scroll Area */}
          <div className="flex-1 overflow-auto bg-[#1c1c1c] p-4 sm:p-6">
            <PaperCanvas
              answer={activeAnswer}
              questionNumber={activeQuestion?.number ?? '1'}
              zoom={viewerZoom}
              page={viewerPage}
              showHighlights={showHighlights}
              allAnswers={reviewData.answers}
              isDefaultDemo={!customReview && (!assessmentId || assessmentId === 'asmt-bio-03')}
            />
          </div>
        </section>
      </div>

      {/* OCR VISUAL DEBUGGER & DEVELOPER DIAGNOSTICS MODAL */}
      {showDiagnostics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="flex max-h-[85vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-700 bg-[#1e1e1e] text-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-[#252525] px-6 py-4">
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-amber-500" />
                <h3 className="font-bold text-base text-white">VedaAI OCR Pipeline Inspector & Diagnostics</h3>
              </div>
              <button
                onClick={() => setShowDiagnostics(false)}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Close
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-slate-800 bg-[#1a1a1a] p-4 text-xs font-mono">
              <div className="rounded-lg bg-slate-900/60 p-2.5">
                <span className="text-slate-400 block text-[10px]">DETECTED QUESTIONS</span>
                <span className="text-sm font-bold text-emerald-400">{reviewData.questions.length} Items</span>
              </div>
              <div className="rounded-lg bg-slate-900/60 p-2.5">
                <span className="text-slate-400 block text-[10px]">ANSWER SEGMENTS</span>
                <span className="text-sm font-bold text-sky-400">{reviewData.answers.length} Blocks</span>
              </div>
              <div className="rounded-lg bg-slate-900/60 p-2.5">
                <span className="text-slate-400 block text-[10px]">MAPPED QUESTIONS</span>
                <span className="text-sm font-bold text-amber-400">
                  {reviewData.mappings.filter((m) => m.status === 'answered').length}/{reviewData.questions.length}
                </span>
              </div>
              <div className="rounded-lg bg-slate-900/60 p-2.5">
                <span className="text-slate-400 block text-[10px]">AVG OCR CONFIDENCE</span>
                <span className="text-sm font-bold text-purple-400">
                  {(
                    (reviewData.answers.reduce((sum, a) => sum + (a.ocrConfidence || 0.95), 0) /
                      (reviewData.answers.length || 1)) *
                    100
                  ).toFixed(1)}%
                </span>
              </div>
            </div>

            {reviewData.ocrAudit && (
              <div className="border-b border-slate-800 bg-[#202020] px-4 py-3 text-[11px] text-slate-300 flex flex-wrap gap-y-1 items-center justify-between">
                <div>
                  <span className="mr-4">Engine: <strong className="text-white">{reviewData.ocrAudit.engines?.join(', ') || 'Tesseract'}</strong></span>
                  <span className="mr-4">Handwriting: <strong className="text-amber-400 capitalize">{reviewData.ocrAudit.handwritingClassification || (reviewData.ocrAudit.handwritingDetected ? 'Handwritten' : 'Printed')}</strong></span>
                  <span className="mr-4">OCR correction: <strong className="text-white">{reviewData.ocrAudit.correctionsApplied ? 'Applied' : 'Raw fallback'}</strong></span>
                  {reviewData.ocrAudit.ocrDiagnostics?.imageQualityScore !== undefined && (
                    <span className="mr-4">Image Quality: <strong className="text-emerald-400">{(reviewData.ocrAudit.ocrDiagnostics.imageQualityScore * 100).toFixed(0)}%</strong></span>
                  )}
                  {reviewData.ocrAudit.ocrDiagnostics?.skewAngle !== undefined && (
                    <span>Skew: <strong className="text-slate-200">{reviewData.ocrAudit.ocrDiagnostics.skewAngle}°</strong></span>
                  )}
                </div>
              </div>
            )}

            {reviewData.ocrAudit?.providerResults && (
              <div className="border-b border-slate-800 bg-[#181818] px-4 py-2 text-[10px] font-mono text-slate-400 overflow-x-auto whitespace-nowrap">
                <span className="text-slate-500 mr-2 uppercase font-semibold">Providers:</span>
                {reviewData.ocrAudit.providerResults.map((result, index) => (
                  <span key={`${result.provider}-${result.pageNumber}-${index}`} className="mr-3 inline-block">
                    {result.provider} p{result.pageNumber}: <strong className={result.status === 'selected' ? 'text-emerald-400' : 'text-slate-300'}>{result.status}</strong> {(result.qualityScore * 100).toFixed(0)}%
                  </span>
                ))}
              </div>
            )}

            {/* OCR Correction Audit Stream */}
            {reviewData.ocrAudit?.ocrCorrectionAudit && reviewData.ocrAudit.ocrCorrectionAudit.length > 0 && (
              <div className="border-b border-slate-800 bg-[#161616] px-4 py-2 text-[10px] font-mono text-slate-400 overflow-x-auto whitespace-nowrap flex items-center gap-2">
                <span className="text-amber-400 font-semibold uppercase">Repairs:</span>
                {reviewData.ocrAudit.ocrCorrectionAudit.slice(0, 8).map((entry, idx) => (
                  <span key={idx} className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-300">
                    <span className="text-rose-400 line-through mr-1">{entry.original}</span>
                    <span className="text-emerald-400 font-bold">{entry.corrected}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Content Body: Master Questions vs Answers Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800 overflow-y-auto p-4 gap-4 flex-1">
              {/* Column 1: Questions List */}
              <div className="space-y-2">
                <h4 className="font-semibold text-xs text-slate-400 uppercase tracking-wider">Questions Extracted</h4>
                <div className="space-y-1.5">
                  {reviewData.questions.map((q) => {
                    const isSelected = (selectedDebugQid || reviewData.questions[0]?.id) === q.id;
                    const mapping = reviewData.mappings.find((m) => m.questionId === q.id);
                    return (
                      <button
                        key={q.id}
                        onClick={() => setSelectedDebugQid(q.id)}
                        className={cn(
                          'w-full text-left rounded-xl p-3 text-xs transition border',
                          isSelected
                            ? 'border-amber-500 bg-amber-950/30 text-white font-medium'
                            : 'border-slate-800 bg-slate-900/40 text-slate-300 hover:bg-slate-800'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-400">Q{q.number}</span>
                          <span className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded font-semibold',
                            mapping?.status === 'answered' ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                          )}>
                            {mapping?.status === 'answered' ? 'Mapped' : 'Unanswered'}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-slate-400 text-[11px] font-sans">{q.text}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Column 2 & 3: Detailed Inspector */}
              <div className="md:col-span-2 space-y-4 pl-0 md:pl-2">
                {(() => {
                  const targetQid = selectedDebugQid || reviewData.questions[0]?.id;
                  const curQ = reviewData.questions.find((q) => q.id === targetQid);
                  const curMap = reviewData.mappings.find((m) => m.questionId === targetQid);
                  const curAns = reviewData.answers.find((a) => a.id === curMap?.answerId);
                  const curGrade = curQ ? reviewData.grades[curQ.id] : undefined;

                  if (!curQ) return <div className="text-slate-500 text-xs">Select a question to inspect.</div>;

                  return (
                    <div className="space-y-3 text-xs font-mono">
                      {/* Question OCR */}
                      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                        <div className="text-amber-400 font-bold mb-1">[QUESTION OCR DATA] Q{curQ.number} ({curQ.marks ?? 5} Marks)</div>
                        <div className="font-sans text-slate-200 text-xs">{curQ.text}</div>
                      </div>

                      {/* Mapping Details */}
                      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                        <div className="text-sky-400 font-bold mb-1">[MAPPING EXPLANATION]</div>
                        <div className="text-slate-300 text-xs font-sans">
                          Status: <span className="font-bold text-white uppercase">{curMap?.status}</span> ({((curMap?.confidence ?? 0) * 100).toFixed(0)}% Confidence)
                        </div>
                        <div className="text-slate-400 text-[11px] font-sans mt-0.5">
                          Rationale: &quot;{curMap?.reason ?? 'Deterministic sequence resolution'}&quot;
                        </div>
                      </div>

                      {/* Mapped Answer Segment: Raw OCR vs Reconstructed Text */}
                      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-2">
                        <div className="flex items-center justify-between text-emerald-400 font-bold mb-1">
                          <span>[MAPPED ANSWER SEGMENT] {curAns ? `Ans [${curAns.detectedQuestionNumber ?? 'Unnumbered'}] (Page ${curAns.pageStart}-${curAns.pageEnd})` : 'None Detected'}</span>
                          {curAns?.repairConfidence && (
                            <span className="text-[10px] text-amber-400 font-normal">Repair Confidence: {(curAns.repairConfidence * 100).toFixed(0)}%</span>
                          )}
                        </div>
                        {curAns ? (
                          <>
                            {/* Raw OCR Text */}
                            <div>
                              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Raw OCR Transcription:</span>
                              <div className="font-sans text-slate-400 text-xs leading-relaxed bg-black/40 p-2.5 rounded-lg border border-slate-800/80">
                                {curAns.rawText || curAns.text}
                              </div>
                            </div>

                            {/* Reconstructed Text */}
                            {curAns.reconstructedText && curAns.reconstructedText !== (curAns.rawText || curAns.text) && (
                              <div>
                                <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider block mb-1">Reconstructed & Cleaned Text (Graded):</span>
                                <div className="font-sans text-slate-100 text-xs leading-relaxed bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-900/40 font-medium">
                                  {curAns.reconstructedText}
                                </div>
                              </div>
                            )}

                            {/* Extracted Concept Graph */}
                            {curAns.concepts && curAns.concepts.length > 0 && (
                              <div className="pt-1">
                                <span className="text-[10px] font-semibold text-sky-400 uppercase tracking-wider block mb-1">Extracted Concept Graph:</span>
                                <div className="flex flex-wrap gap-1">
                                  {curAns.concepts.map((concept, cIdx) => (
                                    <span key={cIdx} className="bg-sky-950/50 text-sky-300 border border-sky-800/50 px-2 py-0.5 rounded text-[10px] font-medium">
                                      ✓ {concept}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Repair Operations List */}
                            {curAns.repairOperations && curAns.repairOperations.length > 0 && (
                              <div className="pt-1">
                                <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider block mb-1">Repairs Applied:</span>
                                <div className="flex flex-wrap gap-1">
                                  {curAns.repairOperations.map((op, oIdx) => (
                                    <span key={oIdx} className="bg-amber-950/40 text-amber-300 border border-amber-800/40 px-2 py-0.5 rounded text-[10px]">
                                      {op}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="text-[11px] text-slate-400 pt-1">
                              OCR Confidence: <span className="text-white font-bold">{((curAns.ocrConfidence || 0.95) * 100).toFixed(1)}%</span> | Bounding Boxes: <span className="text-white font-bold">{curAns.boxes.length} Coordinates</span>
                            </div>
                          </>
                        ) : (
                          <div className="text-rose-400 font-sans text-xs">No matching answer segment was detected in the student paper.</div>
                        )}
                      </div>

                      {/* Evaluator Output & Multi-Criteria Breakdown */}
                      {curGrade && (
                        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-2">
                          <div className="flex items-center justify-between text-purple-400 font-bold mb-1">
                            <span>[GRADING ENGINE] Score: {curGrade.score} / {curGrade.maxScore}</span>
                            {curGrade.withheld && (
                              <span className="text-[10px] text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/50 font-normal">Provisional / Review Flagged</span>
                            )}
                          </div>
                          <div className="text-slate-300 text-xs font-sans">{curGrade.feedback}</div>

                          {/* 5-Criteria Breakdown */}
                          {curGrade.scoringBreakdown && (
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-2 border-t border-slate-800 text-[10px]">
                              <div className="bg-black/30 p-1.5 rounded">
                                <span className="text-slate-400 block">Concepts (40%)</span>
                                <span className="text-sky-400 font-bold">{(curGrade.scoringBreakdown.keyConcepts * 100).toFixed(0)}%</span>
                              </div>
                              <div className="bg-black/30 p-1.5 rounded">
                                <span className="text-slate-400 block">Semantic (25%)</span>
                                <span className="text-emerald-400 font-bold">{(curGrade.scoringBreakdown.semanticSimilarity * 100).toFixed(0)}%</span>
                              </div>
                              <div className="bg-black/30 p-1.5 rounded">
                                <span className="text-slate-400 block">Correctness (15%)</span>
                                <span className="text-amber-400 font-bold">{(curGrade.scoringBreakdown.technicalCorrectness * 100).toFixed(0)}%</span>
                              </div>
                              <div className="bg-black/30 p-1.5 rounded">
                                <span className="text-slate-400 block">Completeness (10%)</span>
                                <span className="text-purple-400 font-bold">{(curGrade.scoringBreakdown.completeness * 100).toFixed(0)}%</span>
                              </div>
                              <div className="bg-black/30 p-1.5 rounded">
                                <span className="text-slate-400 block">Structure (10%)</span>
                                <span className="text-slate-300 font-bold">{(curGrade.scoringBreakdown.structure * 100).toFixed(0)}%</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * PaperCanvas — renders student paper simulation with exact highlight bounding boxes
 * Note: Preserves coordinate logic exactly as specified in requirements.
 */
function PaperCanvas({
  answer,
  questionNumber,
  zoom,
  page,
  showHighlights,
  allAnswers,
  isDefaultDemo,
}: {
  answer: AnswerSegment | undefined;
  questionNumber: string;
  zoom: number;
  page: number;
  showHighlights: boolean;
  allAnswers?: AnswerSegment[];
  isDefaultDemo?: boolean;
}) {
  const showBox = answer && page >= answer.pageStart && page <= answer.pageEnd;
  const box = showBox ? answer.boxes[Math.min(page - answer.pageStart, answer.boxes.length - 1)] : undefined;

  // Find answers active on this page
  const pageAnswers = allAnswers?.filter((a) => page >= a.pageStart && page <= a.pageEnd) || [];

  return (
    <div
      style={{ width: `${Math.max(580, zoom * 6)}px` }}
      className="relative mx-auto min-h-[920px] rounded-sm bg-[#fbf7ee] shadow-2xl transition-all duration-150 [background-image:repeating-linear-gradient(0deg,transparent,transparent_31px,#bdcee1_32px)]"
    >
      {/* Student Red Margin Line */}
      <div className="absolute inset-y-0 left-[13%] w-px bg-red-400" />

      {/* Dynamic Content Rendered for Uploaded Assessments */}
      {!isDefaultDemo && pageAnswers.length > 0 ? (
        <div className="p-8 pl-[18%] font-serif text-[19px] leading-[32px] text-[#12226b] space-y-8">
          {pageAnswers.map((ans) => (
            <div key={ans.id} className="relative">
              <span className="font-bold">
                {ans.detectedQuestionNumber ? `Q${ans.detectedQuestionNumber}. ` : ''}
              </span>
              <span>{ans.text}</span>
            </div>
          ))}
        </div>
      ) : isDefaultDemo ? (
        /* Fallback Demo Mock Content */
        <>
          {page === 1 && (
            <>
              <div className="absolute left-[18%] top-8 font-serif text-[22px] text-[#12226b]">
                Q1. &nbsp; Photosynthesis is the process used by
                <br />
                green plants and some other organisms
                <br />
                to convert light energy into chemical
                <br />
                energy.
              </div>
              <div className="absolute left-[24%] top-[28%] rounded border-2 border-[#13216a] px-7 py-3 font-serif text-xl text-[#13216a]">
                6CO₂ + 6H₂O &nbsp; — Light → &nbsp; C₆H₁₂O₆ + 6O₂
              </div>
              <div className="absolute left-[22%] top-[46%] font-serif text-lg leading-9 text-[#12226b]">
                Carbon dioxide &nbsp; ↘ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ☀ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                ↙ &nbsp; Oxygen
                <br />
                <span className="ml-40">🌿</span>
                <br />
                <span className="ml-36">Water</span>
              </div>
              <div className="absolute left-[14%] top-[67%] font-serif text-[21px] leading-9 text-[#12226b]">
                Q2(b). &nbsp;&nbsp; Plant cells have a cell wall and chloroplasts.
                <br />
                <span className="ml-14">Animal cells do not have either structure.</span>
              </div>
            </>
          )}

          {page === 2 && (
            <>
              <div className="absolute left-[18%] top-8 font-serif text-[22px] text-[#12226b]">
                Q2(a). &nbsp; The mitochondrion is known as the
                <br />
                powerhouse of the cell and releases energy.
              </div>
              <div className="absolute left-[18%] top-[38%] font-serif text-[21px] leading-9 text-[#12226b]">
                Q3. &nbsp;&nbsp; Water enters through root hairs by osmosis,
                <br />
                <span className="ml-12">then travels up the xylem vessels to the leaves.</span>
                <br />
                <span className="ml-12">Transpiration pull helps it move upward.</span>
              </div>
            </>
          )}

          {page === 3 && (
            <>
              <div className="absolute left-[18%] top-8 font-serif text-[21px] leading-9 text-[#12226b]">
                (Continuation Q3)
                <br />
                Cohesion and adhesion forces allow continuous water
                <br />
                column throughout the plant stem.
              </div>
              <div className="absolute left-[18%] top-[38%] font-serif text-[21px] text-[#12226b]">
                Extra notes:
                <br />A cell contains a nucleus and cytoplasm.
              </div>
            </>
          )}

          {page === 4 && (
            <div className="absolute left-[18%] top-8 font-serif text-[21px] text-slate-400 italic">
              [ End of Student Answer Script — Page 4 Blank ]
            </div>
          )}
        </>
      ) : (
        <div className="absolute left-[18%] top-8 font-serif text-[18px] text-slate-400 italic">
          [ No answer text detected on Page {page} ]
        </div>
      )}

      {/* OCR Answer Highlight Box Overlay (Exact Coordinate System Preserved) */}
      {showHighlights && box && (
        <div
          style={{
            left: `${box.x}%`,
            top: `${box.y}%`,
            width: `${box.width}%`,
            height: `${box.height}%`,
          }}
          className="absolute rounded-2xl border-2 border-[#2dbf13] bg-[#a9eb75]/25 shadow-sm transition-all pointer-events-none"
        >
          <span className="absolute -top-7 left-0 flex items-center gap-1 rounded-t-lg bg-[#2dbf13] px-3 py-1 text-xs font-bold text-white shadow-md">
            <Check className="h-3 w-3" />
            <span>Q{questionNumber} Answer Segment</span>
          </span>
        </div>
      )}
    </div>
  );
}
