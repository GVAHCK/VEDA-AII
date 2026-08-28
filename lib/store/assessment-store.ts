'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Review } from '@/lib/types';
import { demoReview } from '@/lib/demo';

export interface AssessmentItem {
  id: string;
  title: string;
  subject: string;
  date: string;
  timestamp: number;
  score: number;
  maxScore: number;
  status: 'Completed' | 'Processing' | 'Draft' | 'Failed';
  questionsCount: number;
  studentName?: string;
  reviewData?: Review;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  timestamp: number;
  read: boolean;
  type: 'info' | 'success' | 'warning';
  link?: string;
}

export interface UserSettings {
  teacherName: string;
  institutionName: string;
  email: string;
  subjectDefault: string;
  theme: 'light' | 'dark' | 'system';
  ocrConfidenceThreshold: number; // e.g. 85
  extractionSensitivity: 'low' | 'balanced' | 'high';
  ocrLanguage: string;
  geminiModel: string;
  geminiConfigured: boolean;
  autoAdjudication: boolean;
  emailNotifications: boolean;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'info' | 'error';
}

interface AppStore {
  // Assessments
  assessments: AssessmentItem[];
  currentAssessmentId: string | null;
  addAssessment: (assessment: AssessmentItem) => void;
  updateAssessment: (id: string, updates: Partial<AssessmentItem>) => void;
  deleteAssessment: (id: string) => void;
  duplicateAssessment: (id: string) => string;
  reprocessAssessment: (id: string) => void;
  getAssessment: (id: string) => AssessmentItem | undefined;

  // Active Review State
  activeQuestionId: string;
  expandedQuestionIds: string[];
  viewerZoom: number;
  viewerPage: number;
  searchQuestionQuery: string;
  questionFilter: 'all' | 'answered' | 'unanswered' | 'low_confidence' | 'full_score' | 'partial_score';
  setActiveQuestionId: (id: string) => void;
  toggleQuestionExpanded: (id: string) => void;
  setAllQuestionsExpanded: (expanded: boolean, allIds?: string[]) => void;
  setViewerZoom: (zoom: number | ((prev: number) => number)) => void;
  setViewerPage: (page: number | ((prev: number) => number)) => void;
  setSearchQuestionQuery: (query: string) => void;
  setQuestionFilter: (filter: AppStore['questionFilter']) => void;
  updateQuestionFeedback: (assessmentId: string, questionId: string, feedback: string) => void;

  // Notifications
  notifications: AppNotification[];
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotifications: () => void;
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;

  // Settings
  settings: UserSettings;
  updateSettings: (updates: Partial<UserSettings>) => void;
  resetSettings: () => void;

  // Global UI State
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;

  // Toasts
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

const defaultSettings: UserSettings = {
  teacherName: 'Arjun Mehta',
  institutionName: 'Delhi Public School (R.K. Puram)',
  email: 'arjun.mehta@dps.edu.in',
  subjectDefault: 'Biology',
  theme: 'light',
  ocrConfidenceThreshold: 85,
  extractionSensitivity: 'balanced',
  ocrLanguage: 'English',
  geminiModel: 'Gemini 2.5 Flash',
  geminiConfigured: true,
  autoAdjudication: true,
  emailNotifications: true,
};

const initialAssessments: AssessmentItem[] = [
  {
    id: 'asmt-bio-03',
    title: 'Biology · Unit test 03 (Photosynthesis & Respiration)',
    subject: 'Biology',
    date: 'Today, 10:42 AM',
    timestamp: Date.now() - 1000 * 60 * 35,
    score: 15,
    maxScore: 20,
    status: 'Completed',
    questionsCount: 5,
    studentName: 'Rohan Sharma',
    reviewData: demoReview,
  },
  {
    id: 'asmt-phy-04',
    title: 'Physics · Chapter 4 (Kinematics & Dynamics)',
    subject: 'Physics',
    date: 'Yesterday, 2:16 PM',
    timestamp: Date.now() - 1000 * 60 * 60 * 24,
    score: 18,
    maxScore: 25,
    status: 'Completed',
    questionsCount: 8,
    studentName: 'Priya Patel',
  },
  {
    id: 'asmt-chem-mol',
    title: 'Chemistry · Molecules & Periodic Trends',
    subject: 'Chemistry',
    date: '12 Aug, 11:05 AM',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 15,
    score: 0,
    maxScore: 20,
    status: 'Draft',
    questionsCount: 6,
    studentName: 'Aarav Gupta',
  },
  {
    id: 'asmt-math-calc',
    title: 'Mathematics · Differential Calculus Unit 1',
    subject: 'Mathematics',
    date: '08 Aug, 09:30 AM',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 19,
    score: 19,
    maxScore: 20,
    status: 'Completed',
    questionsCount: 7,
    studentName: 'Sanya Malhotra',
  },
  {
    id: 'asmt-bio-cell',
    title: 'Biology · Cell Structure & Organelles Quiz',
    subject: 'Biology',
    date: '02 Aug, 04:15 PM',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 25,
    score: 12,
    maxScore: 15,
    status: 'Completed',
    questionsCount: 5,
    studentName: 'Kabir Verma',
  },
];

const initialNotifications: AppNotification[] = [
  {
    id: 'notif-1',
    title: 'Biology Unit Test 03 Ready',
    message: 'Extraction and grading completed with 96% OCR confidence.',
    time: '35m ago',
    timestamp: Date.now() - 1000 * 60 * 35,
    read: false,
    type: 'success',
    link: '/extract',
  },
  {
    id: 'notif-2',
    title: 'OCR Model Updated',
    message: 'Tesseract & Gemini hybrid pipeline sensitivity set to Balanced.',
    time: '2h ago',
    timestamp: Date.now() - 1000 * 60 * 120,
    read: false,
    type: 'info',
    link: '/settings',
  },
  {
    id: 'notif-3',
    title: 'Weekly Performance Report',
    message: '24 assessments evaluated across 3 subjects with 78% average score.',
    time: '1d ago',
    timestamp: Date.now() - 1000 * 60 * 60 * 24,
    read: true,
    type: 'info',
    link: '/assessments',
  },
];

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Assessments
      assessments: initialAssessments,
      currentAssessmentId: 'asmt-bio-03',
      addAssessment: (assessment) => {
        set((state) => ({
          assessments: [assessment, ...state.assessments],
          currentAssessmentId: assessment.id,
        }));
        get().addToast({
          title: 'Assessment Created',
          description: `"${assessment.title}" has been saved.`,
          type: 'success',
        });
      },
      updateAssessment: (id, updates) => {
        set((state) => ({
          assessments: state.assessments.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        }));
        get().addToast({
          title: 'Assessment Updated',
          description: 'Changes saved successfully.',
          type: 'success',
        });
      },
      deleteAssessment: (id) => {
        const item = get().assessments.find((a) => a.id === id);
        set((state) => ({
          assessments: state.assessments.filter((a) => a.id !== id),
          currentAssessmentId: state.currentAssessmentId === id ? null : state.currentAssessmentId,
        }));
        get().addToast({
          title: 'Assessment Deleted',
          description: item ? `"${item.title}" was removed.` : 'Assessment removed.',
          type: 'info',
        });
      },
      duplicateAssessment: (id) => {
        const item = get().assessments.find((a) => a.id === id);
        if (!item) return '';
        const newId = `asmt-${Date.now()}`;
        const copy: AssessmentItem = {
          ...item,
          id: newId,
          title: `${item.title} (Copy)`,
          date: 'Just now',
          timestamp: Date.now(),
        };
        set((state) => ({
          assessments: [copy, ...state.assessments],
        }));
        get().addToast({
          title: 'Assessment Duplicated',
          description: `Created copy of "${item.title}".`,
          type: 'success',
        });
        return newId;
      },
      reprocessAssessment: (id) => {
        const item = get().assessments.find((a) => a.id === id);
        if (!item) return;
        set((state) => ({
          assessments: state.assessments.map((a) =>
            a.id === id ? { ...a, status: 'Processing', date: 'Processing now...' } : a
          ),
        }));
        get().addToast({
          title: 'Reprocessing Started',
          description: `Re-evaluating OCR and grading for "${item.title}".`,
          type: 'info',
        });

        // Simulate async completion
        setTimeout(() => {
          set((state) => ({
            assessments: state.assessments.map((a) =>
              a.id === id ? { ...a, status: 'Completed', date: 'Just now', timestamp: Date.now() } : a
            ),
          }));
          get().addToast({
            title: 'Reprocessing Complete',
            description: `"${item.title}" successfully re-evaluated.`,
            type: 'success',
          });
        }, 1800);
      },
      getAssessment: (id) => {
        return get().assessments.find((a) => a.id === id);
      },

      // Active Review State
      activeQuestionId: 'q1',
      expandedQuestionIds: ['q1'],
      viewerZoom: 100,
      viewerPage: 1,
      searchQuestionQuery: '',
      questionFilter: 'all',
      setActiveQuestionId: (id) => set({ activeQuestionId: id }),
      toggleQuestionExpanded: (id) => {
        set((state) => ({
          expandedQuestionIds: state.expandedQuestionIds.includes(id)
            ? state.expandedQuestionIds.filter((qid) => qid !== id)
            : [...state.expandedQuestionIds, id],
        }));
      },
      setAllQuestionsExpanded: (expanded, allIds) => {
        set({
          expandedQuestionIds: expanded ? (allIds ?? ['q1', 'q2', 'q3', 'q4', 'q5']) : [],
        });
      },
      setViewerZoom: (zoomOrFn) => {
        set((state) => ({
          viewerZoom: typeof zoomOrFn === 'function' ? zoomOrFn(state.viewerZoom) : zoomOrFn,
        }));
      },
      setViewerPage: (pageOrFn) => {
        set((state) => ({
          viewerPage: typeof pageOrFn === 'function' ? pageOrFn(state.viewerPage) : pageOrFn,
        }));
      },
      setSearchQuestionQuery: (query) => set({ searchQuestionQuery: query }),
      setQuestionFilter: (filter) => set({ questionFilter: filter }),
      updateQuestionFeedback: (assessmentId, questionId, feedback) => {
        set((state) => {
          const updatedAssessments = state.assessments.map((asmt) => {
            if (asmt.id === assessmentId && asmt.reviewData) {
              const currentGrade = asmt.reviewData.grades[questionId];
              return {
                ...asmt,
                reviewData: {
                  ...asmt.reviewData,
                  grades: {
                    ...asmt.reviewData.grades,
                    [questionId]: {
                      ...currentGrade,
                      feedback,
                    },
                  },
                },
              };
            }
            return asmt;
          });
          return { assessments: updatedAssessments };
        });
        get().addToast({
          title: 'Feedback Saved',
          description: `Custom feedback for question #${questionId} saved.`,
          type: 'success',
        });
      },

      // Notifications
      notifications: initialNotifications,
      markNotificationAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        }));
      },
      markAllNotificationsAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }));
        get().addToast({
          title: 'All Caught Up',
          description: 'All notifications marked as read.',
          type: 'info',
        });
      },
      clearNotifications: () => {
        set({ notifications: [] });
      },
      addNotification: (item) => {
        const notif: AppNotification = {
          ...item,
          id: `notif-${Date.now()}`,
          timestamp: Date.now(),
          read: false,
        };
        set((state) => ({
          notifications: [notif, ...state.notifications],
        }));
      },

      // Settings
      settings: defaultSettings,
      updateSettings: (updates) => {
        set((state) => ({
          settings: { ...state.settings, ...updates },
        }));
        get().addToast({
          title: 'Settings Saved',
          description: 'Your workspace preferences have been updated.',
          type: 'success',
        });
      },
      resetSettings: () => {
        set({ settings: defaultSettings });
        get().addToast({
          title: 'Settings Reset',
          description: 'Restored factory default preferences.',
          type: 'info',
        });
      },

      // Global UI State
      sidebarCollapsed: false,
      mobileMenuOpen: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),

      // Toasts
      toasts: [],
      addToast: (toast) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        set((state) => ({
          toasts: [...state.toasts, { ...toast, id }],
        }));
        setTimeout(() => {
          set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
          }));
        }, 3500);
      },
      removeToast: (id) => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      },
    }),
    {
      name: 'veda-ai-storage-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        assessments: state.assessments,
        currentAssessmentId: state.currentAssessmentId,
        settings: state.settings,
        notifications: state.notifications,
      }),
    }
  )
);
