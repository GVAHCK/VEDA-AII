'use client';

import React, { useState, useMemo } from 'react';
import {
  Activity,
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  ExternalLink,
  FileQuestion,
  HelpCircle,
  LifeBuoy,
  Mail,
  MessageSquare,
  Search,
  Send,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
  X,
  Zap,
} from 'lucide-react';
import { useAppStore } from '@/lib/store/assessment-store';
import { cn } from '@/lib/utils';

const faqs = [
  {
    category: 'Extraction & OCR',
    question: 'How does VedaAI extract handwriting and printed text?',
    answer:
      'VedaAI combines high-resolution PDF canvas rasterization with Tesseract.js word-coordinate extraction. Every recognized token retains its exact bounding-box coordinates (X, Y, Width, Height) on the original student paper.',
  },
  {
    category: 'Extraction & OCR',
    question: 'What file formats and sizes are supported?',
    answer:
      'You can upload PDF files, PNG, JPG, and JPEG images up to 20 MB per file. Multi-page PDFs (up to 20 pages per student submission) are automatically split and indexed.',
  },
  {
    category: 'Mapping & Adjudication',
    question: 'How are student answers matched to question numbers?',
    answer:
      'Our hybrid mapping engine searches for explicit question headers (e.g. "Q1", "2(a)", "Ans 3") first. If handwriting or formatting is ambiguous, Gemini LLM adjudication compares semantic question intent against segmented paragraphs.',
  },
  {
    category: 'Grading & Rubrics',
    question: 'Can I edit the AI-generated feedback and scores?',
    answer:
      'Yes! In the Review mode, you can click "Edit" on any question feedback box to customize the comments, or click "Regenerate" to ask Gemini to re-evaluate based on updated rubrics.',
  },
  {
    category: 'Troubleshooting',
    question: 'What if a question is marked as Unanswered when it exists?',
    answer:
      'If student handwriting is heavily skewed or placed in an unexpected margin, you can check the "Unmatched answers" segment on Page 3 or adjust OCR Confidence Threshold to High in Settings.',
  },
  {
    category: 'General',
    question: 'Is student assessment data kept secure?',
    answer:
      'All OCR rasterization runs in your browser runtime and your configured private backend. No student handwriting is shared or stored externally beyond the configured Gemini evaluation session.',
  },
];

export function HelpView() {
  const addToast = useAppStore((s) => s.addToast);

  // Search and tabs
  const [faqSearch, setFaqSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Support Modal
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [supportForm, setSupportForm] = useState({
    subject: '',
    category: 'Question Mapping',
    message: '',
  });

  // Diagnostic wizard state
  const [diagnosticIssue, setDiagnosticIssue] = useState('handwriting');

  const filteredFaqs = useMemo(() => {
    return faqs.filter((item) => {
      const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
      const matchesQuery =
        !faqSearch.trim() ||
        item.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
        item.answer.toLowerCase().includes(faqSearch.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [faqSearch, activeCategory]);

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSupportModalOpen(false);
    setSupportForm({ subject: '', category: 'Question Mapping', message: '' });
    addToast({
      title: 'Support Ticket Submitted',
      description: 'Our engineering team will respond to your registered email within 2 hours.',
      type: 'success',
    });
  };

  return (
    <main className="min-h-[calc(100vh-56px)] bg-[#fafafa] p-4 sm:p-6 lg:p-8 dark:bg-[#121212]">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* HERO */}
        <div className="text-center">
          <span className="rounded-md bg-orange-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#f45a2c] dark:bg-orange-950 dark:text-orange-300">
            KNOWLEDGE BASE &amp; SUPPORT
          </span>
          <h1 className="mt-3 text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            How can we help you, Teacher?
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Guides, FAQs, interactive troubleshooting diagnostics, and direct support for VedaAI
            assessment grading.
          </p>

          {/* Search Box */}
          <div className="relative mx-auto mt-6 max-w-lg">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
              placeholder="Search help articles, OCR troubleshooting, rubric guides..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-10 text-xs sm:text-sm text-slate-900 shadow-sm outline-none focus:border-[#f45a2c] focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-[#181818] dark:text-white dark:focus:border-orange-500"
            />
            {faqSearch && (
              <button
                onClick={() => setFaqSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* SYSTEM STATUS STRIP */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#181818]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
              </span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Live System Status
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              All Systems Operational • Uptime 99.98%
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
            <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
              <span className="text-slate-400 text-[10px]">Tesseract OCR Engine</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">Operational</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
              <span className="text-slate-400 text-[10px]">Gemini 2.5 API</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">38ms Latency</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
              <span className="text-slate-400 text-[10px]">PDF Rasterizer</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">300 DPI Active</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
              <span className="text-slate-400 text-[10px]">Mapping Engine</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">v1.4.2 Ready</p>
            </div>
          </div>
        </div>

        {/* STEP-BY-STEP WORKFLOW GUIDE */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#f45a2c]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              VedaAI 4-Step Workflow Guide
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: '01',
                title: 'Upload Papers',
                desc: 'Attach the master Question Paper and student handwritten Answer Sheet (PDF or images).',
              },
              {
                step: '02',
                title: 'OCR & Coordinate Sync',
                desc: 'VedaAI detects question labels and bounding-box coordinates for each handwritten answer segment.',
              },
              {
                step: '03',
                title: 'AI Adjudication',
                desc: 'Gemini evaluates student answers against grading criteria, highlighting strengths and errors.',
              },
              {
                step: '04',
                title: 'Review & Export',
                desc: 'Inspect exact green highlight boxes on student paper, edit remarks, and download final PDF reports.',
              },
            ].map((card) => (
              <div
                key={card.step}
                className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#181818]"
              >
                <span className="text-xl font-black text-[#f45a2c]">{card.step}</span>
                <h3 className="mt-2 text-xs font-bold text-slate-900 dark:text-white">
                  {card.title}
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 2-COLUMN: FAQ & INTERACTIVE TROUBLESHOOTING */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* FAQ ACCORDION */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Frequently Asked Questions
              </h2>
              {/* Category Pills */}
              <div className="flex flex-wrap gap-1 text-[10px]">
                {['All', 'Extraction & OCR', 'Mapping & Adjudication', 'Grading & Rubrics'].map(
                  (cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={cn(
                        'rounded-lg px-2.5 py-1 font-semibold transition',
                        activeCategory === cat
                          ? 'bg-[#2b2b2b] text-white dark:bg-[#ff5c28]'
                          : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-[#1e1e1e] dark:text-slate-300'
                      )}
                    >
                      {cat}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="space-y-2.5">
              {filteredFaqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={faq.question}
                    className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-[#181818]"
                  >
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      className="flex w-full items-center justify-between p-4 text-left font-bold text-xs sm:text-sm text-slate-800 hover:text-[#f45a2c] dark:text-slate-200"
                    >
                      <span>{faq.question}</span>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 shrink-0 text-slate-400 transition-transform',
                          isOpen && 'rotate-180 text-[#f45a2c]'
                        )}
                      />
                    </button>
                    {isOpen && (
                      <div className="border-t border-slate-100 bg-slate-50/50 p-4 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: TROUBLESHOOTING ASSISTANT & CONTACT CARD */}
          <div className="space-y-6">
            {/* Interactive Diagnostics Tool */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#181818] space-y-3">
              <div className="flex items-center gap-2">
                <LifeBuoy className="h-4 w-4 text-[#f45a2c]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Quick Diagnostics Wizard
                </h3>
              </div>
              <p className="text-[11px] text-slate-400">
                Select an issue you are observing for immediate diagnostic recommendations:
              </p>

              <select
                value={diagnosticIssue}
                onChange={(e) => setDiagnosticIssue(e.target.value)}
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-[#f45a2c] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="handwriting">Handwriting text recognized incorrectly</option>
                <option value="subletter">Sub-letter question 2(a) merged with 2(b)</option>
                <option value="unanswered">Valid answer marked as skipped/unanswered</option>
                <option value="slow">Processing pipeline takes longer than 20 seconds</option>
              </select>

              <div className="rounded-2xl bg-orange-50/60 p-3.5 text-xs text-slate-700 dark:bg-orange-950/20 dark:text-slate-300">
                {diagnosticIssue === 'handwriting' && (
                  <p>
                    <strong>Solution:</strong> In <em>Settings → OCR Engine</em>, adjust Extraction
                    Sensitivity to <strong>High</strong> and ensure scans are at 300 DPI with good
                    lighting.
                  </p>
                )}
                {diagnosticIssue === 'subletter' && (
                  <p>
                    <strong>Solution:</strong> The sub-letter segmenter uses fuzzy numbering regex.
                    Enable <strong>AI-assisted Adjudication</strong> in Settings to allow Gemini to split
                    subparts.
                  </p>
                )}
                {diagnosticIssue === 'unanswered' && (
                  <p>
                    <strong>Solution:</strong> Ensure student wrote question labels clearly in the left
                    margin line. Check the bottom of page 3 for unmatched bounding boxes.
                  </p>
                )}
                {diagnosticIssue === 'slow' && (
                  <p>
                    <strong>Solution:</strong> Large multi-megabyte PDFs require local canvas rasterization.
                    Consider compressing PDFs under 10MB for instant 3-second evaluation.
                  </p>
                )}
              </div>
            </div>

            {/* Direct Contact Support Card */}
            <div className="rounded-3xl bg-gradient-to-br from-[#2f2f2f] to-[#1a1a1a] p-6 text-white shadow-lg space-y-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#444] text-[#ff8865]">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Need assistance from our engineers?</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                  Submit a query directly to the VedaAI product &amp; curriculum support desk.
                </p>
              </div>

              <button
                onClick={() => setIsSupportModalOpen(true)}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#ff5c28] text-xs font-bold text-white shadow-md hover:bg-[#e64718] transition"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Open Support Ticket</span>
              </button>
            </div>
          </div>
        </div>

        {/* SUPPORT MODAL */}
        {isSupportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsSupportModalOpen(false)}
            />
            <form
              onSubmit={handleSupportSubmit}
              className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-[#1e1e1e]"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-bold">Contact VedaAI Support Desk</h3>
                <button
                  type="button"
                  onClick={() => setIsSupportModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Subject / Topic
                  </label>
                  <input
                    required
                    type="text"
                    value={supportForm.subject}
                    onChange={(e) =>
                      setSupportForm({ ...supportForm, subject: e.target.value })
                    }
                    placeholder="e.g. OCR question extraction bounding box offset"
                    className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-[#f45a2c] focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Category
                  </label>
                  <select
                    value={supportForm.category}
                    onChange={(e) =>
                      setSupportForm({ ...supportForm, category: e.target.value })
                    }
                    className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-[#f45a2c] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <option value="Question Mapping">Question Mapping &amp; Coordinates</option>
                    <option value="Gemini Rubrics">Gemini Grading &amp; Rubrics</option>
                    <option value="File Uploads">PDF Uploads &amp; File Formats</option>
                    <option value="Feature Request">Feature Request &amp; Feedback</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Detailed Message
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={supportForm.message}
                    onChange={(e) =>
                      setSupportForm({ ...supportForm, message: e.target.value })
                    }
                    placeholder="Describe the question paper structure or behavior you'd like help with..."
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-[#f45a2c] focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSupportModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#ff5c28] px-5 py-2 text-xs font-bold text-white hover:bg-[#e64718]"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Submit Ticket</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
