'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  ChevronDown,
  FileText,
  FolderOpen,
  HelpCircle,
  Home,
  Menu,
  Moon,
  PlusCircle,
  Search,
  Settings,
  Sparkles,
  Sun,
  User,
  X,
  Check,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sliders,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { useAppStore } from '@/lib/store/assessment-store';
import { cn } from '@/lib/utils';
import { ToastContainer } from './toast-container';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Store bindings
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const assessments = useAppStore((s) => s.assessments);
  const notifications = useAppStore((s) => s.notifications);
  const markNotificationAsRead = useAppStore((s) => s.markNotificationAsRead);
  const markAllNotificationsAsRead = useAppStore((s) => s.markAllNotificationsAsRead);
  const clearNotifications = useAppStore((s) => s.clearNotifications);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed);
  const mobileMenuOpen = useAppStore((s) => s.mobileMenuOpen);
  const setMobileMenuOpen = useAppStore((s) => s.setMobileMenuOpen);
  const addToast = useAppStore((s) => s.addToast);

  // Local component state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K for search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsNotificationsOpen(false);
        setIsProfileOpen(false);
        setMobileMenuOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setMobileMenuOpen]);

  // Apply dark mode class to html element when theme is dark
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (settings.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [settings.theme]);

  // Computed unread notifications count
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Search matches
  const searchResults = searchQuery.trim()
    ? assessments.filter(
        (a) =>
          a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (a.studentName && a.studentName.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const navItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      aliases: ['/', '/dashboard'],
      icon: Home,
    },
    {
      label: 'Extract & Review',
      href: '/extract',
      aliases: ['/extract', '/upload'],
      icon: FileText,
      badge: 'AI',
    },
    {
      label: 'Assessments',
      href: '/assessments',
      aliases: ['/assessments'],
      icon: FolderOpen,
      count: assessments.length,
    },
    {
      label: 'Settings',
      href: '/settings',
      aliases: ['/settings'],
      icon: Settings,
    },
    {
      label: 'Help & Docs',
      href: '/help',
      aliases: ['/help'],
      icon: HelpCircle,
    },
  ];

  const isNavActive = (aliases: string[]) => {
    if (aliases.includes('/') && (pathname === '/' || pathname === '/dashboard')) return true;
    return aliases.some((alias) => alias !== '/' && pathname.startsWith(alias));
  };

  const toggleTheme = () => {
    const next = settings.theme === 'dark' ? 'light' : 'dark';
    updateSettings({ theme: next });
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900 antialiased dark:bg-[#121212] dark:text-slate-100">
      {/* Toast Notifications */}
      <ToastContainer />

      {/* Main Grid: Collapsible Sidebar + Content */}
      <div
        className={cn(
          'transition-all duration-300',
          sidebarCollapsed ? 'lg:grid lg:grid-cols-[72px_1fr]' : 'lg:grid lg:grid-cols-[240px_1fr]'
        )}
      >
        {/* DESKTOP SIDEBAR */}
        <aside
          className={cn(
            'hidden min-h-screen flex-col border-r border-slate-200/80 bg-white px-3 py-4 transition-all duration-300 dark:border-slate-800 dark:bg-[#181818] lg:flex',
            sidebarCollapsed ? 'items-center px-2' : ''
          )}
        >
          {/* Logo & Brand */}
          <div className="flex h-10 w-full items-center justify-between px-2">
            <Link
              href="/dashboard"
              className={cn(
                'flex items-center gap-2.5 font-black tracking-tight text-slate-900 transition-opacity dark:text-white',
                sidebarCollapsed ? 'justify-center' : ''
              )}
            >
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#ff6b3d] to-[#e64718] font-black text-white shadow-md shadow-orange-500/20">
                V
              </div>
              {!sidebarCollapsed && (
                <div className="flex flex-col">
                  <span className="text-base font-extrabold tracking-tight">VedaAI</span>
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-[#ff5c28]">
                    Assessment Studio
                  </span>
                </div>
              )}
            </Link>
          </div>

          {/* New Assessment Quick Button */}
          <div className="mt-5 w-full">
            <Link
              href="/extract"
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl bg-[#2b2b2b] text-xs font-semibold text-white shadow-sm transition hover:bg-[#1f1f1f] active:scale-[0.98] dark:bg-[#ff5c28] dark:hover:bg-[#e84e1b]',
                sidebarCollapsed ? 'h-10 w-10 p-0' : 'h-10 w-full px-3'
              )}
              title="New Assessment"
            >
              <PlusCircle className="h-4 w-4 shrink-0 text-[#ff7e54] dark:text-white" />
              {!sidebarCollapsed && <span>New Assessment</span>}
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="mt-6 flex-1 space-y-1.5 w-full">
            <div className={cn('px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500', sidebarCollapsed && 'sr-only')}>
              Navigation
            </div>
            {navItems.map((item) => {
              const active = isNavActive(item.aliases);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all',
                    active
                      ? 'bg-[#fff0eb] text-[#f45a2c] shadow-sm shadow-orange-100 dark:bg-orange-950/40 dark:text-orange-400 dark:shadow-none'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200',
                    sidebarCollapsed && 'justify-center px-0 h-10 w-10 mx-auto'
                  )}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0 transition-colors',
                      active
                        ? 'text-[#f45a2c] dark:text-orange-400'
                        : 'text-slate-400 group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-slate-300'
                    )}
                  />
                  {!sidebarCollapsed && (
                    <span className="flex-1 truncate">{item.label}</span>
                  )}
                  {!sidebarCollapsed && item.badge && (
                    <span className="rounded-md bg-orange-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-orange-700 dark:bg-orange-900/60 dark:text-orange-300">
                      {item.badge}
                    </span>
                  )}
                  {!sidebarCollapsed && item.count !== undefined && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {item.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Controls: User Card & Collapse toggle */}
          <div className="mt-auto w-full pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
            {!sidebarCollapsed ? (
              <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-orange-100 font-bold text-[#f45a2c] dark:bg-orange-900/40 dark:text-orange-300 text-xs">
                  {settings.teacherName
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                    {settings.teacherName}
                  </p>
                  <p className="truncate text-[10px] text-slate-400 dark:text-slate-500">
                    {settings.institutionName}
                  </p>
                </div>
              </div>
            ) : null}

            {/* Collapse / Expand Desktop Toggle */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-xl text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4" />
                  <span>Collapse sidebar</span>
                </>
              )}
            </button>
          </div>
        </aside>

        {/* MOBILE SLIDE-OVER DRAWER */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Drawer */}
            <div className="fixed inset-y-0 left-0 flex w-72 flex-col bg-white p-5 shadow-2xl dark:bg-[#181818] animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 font-bold"
                >
                  <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#ff6b3d] to-[#e64718] font-black text-white">
                    V
                  </div>
                  <div>
                    <span className="text-base font-extrabold">VedaAI</span>
                    <span className="block text-[9px] font-semibold uppercase tracking-wider text-[#ff5c28]">
                      Assessment Studio
                    </span>
                  </div>
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4">
                <Link
                  href="/extract"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#2b2b2b] text-xs font-semibold text-white dark:bg-[#ff5c28]"
                >
                  <PlusCircle className="h-4 w-4 text-[#ff7e54] dark:text-white" />
                  <span>New Assessment</span>
                </Link>
              </div>

              <nav className="mt-6 flex-1 space-y-1">
                {navItems.map((item) => {
                  const active = isNavActive(item.aliases);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                        active
                          ? 'bg-[#fff0eb] text-[#f45a2c] dark:bg-orange-950/40 dark:text-orange-400'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-900/60 dark:text-orange-300">
                          {item.badge}
                        </span>
                      )}
                      {item.count !== undefined && (
                        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {item.count}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-orange-100 font-bold text-[#f45a2c] text-xs">
                    {settings.teacherName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                      {settings.teacherName}
                    </p>
                    <p className="truncate text-[10px] text-slate-400">
                      {settings.institutionName}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MAIN BODY AREA */}
        <div className="flex min-w-0 flex-col">
          {/* HEADER */}
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-[#181818]/95 sm:px-6">
            {/* Mobile Menu Trigger & Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
                aria-label="Open navigation menu"
              >
                <Menu className="h-4 w-4" />
              </button>

              {/* Global Search Bar */}
              <div className="relative" ref={searchRef}>
                <div className="flex h-9 w-48 sm:w-72 md:w-80 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-400 focus-within:border-[#f45a2c] focus-within:bg-white focus-within:text-slate-900 focus-within:ring-2 focus-within:ring-orange-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400 dark:focus-within:border-orange-500 dark:focus-within:bg-[#202020] dark:focus-within:text-slate-100 dark:focus-within:ring-orange-950">
                  <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsSearchOpen(true);
                    }}
                    onFocus={() => setIsSearchOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchQuery.trim()) {
                        router.push(`/assessments?search=${encodeURIComponent(searchQuery)}`);
                        setIsSearchOpen(false);
                      }
                    }}
                    placeholder="Search assessments, subjects... (Ctrl+K)"
                    className="w-full bg-transparent outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="rounded p-0.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Search Results Dropdown */}
                {isSearchOpen && searchQuery.trim() && (
                  <div className="absolute left-0 top-11 z-40 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-[#202020]">
                    <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-slate-400">
                      <span>Matching Assessments ({searchResults.length})</span>
                      <kbd className="rounded bg-slate-100 px-1 py-0.5 text-[9px] text-slate-500 dark:bg-slate-800">
                        ESC to close
                      </kbd>
                    </div>
                    <div className="mt-1 max-h-64 overflow-y-auto space-y-1">
                      {searchResults.length > 0 ? (
                        searchResults.map((asmt) => (
                          <button
                            key={asmt.id}
                            onClick={() => {
                              router.push(`/extract?id=${asmt.id}`);
                              setIsSearchOpen(false);
                              setSearchQuery('');
                            }}
                            className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left hover:bg-[#fff6f2] dark:hover:bg-slate-800 transition"
                          >
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-orange-100 text-[#f45a2c] dark:bg-orange-950 dark:text-orange-400">
                              <FileText className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                                {asmt.title}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                <span>{asmt.subject}</span>
                                <span>•</span>
                                <span>{asmt.date}</span>
                              </div>
                            </div>
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                              {asmt.score}/{asmt.maxScore}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="py-6 text-center text-xs text-slate-500">
                          No results found for &ldquo;{searchQuery}&rdquo;
                        </div>
                      )}
                    </div>
                    <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-800">
                      <Link
                        href={`/assessments?search=${encodeURIComponent(searchQuery)}`}
                        onClick={() => setIsSearchOpen(false)}
                        className="flex w-full items-center justify-center gap-1 text-center text-xs font-semibold text-[#f45a2c] hover:underline"
                      >
                        <span>View all in Assessments page</span>
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                aria-label="Toggle color theme"
                className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                title={`Switch to ${settings.theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {settings.theme === 'dark' ? (
                  <Sun className="h-4 w-4 text-amber-400" />
                ) : (
                  <Moon className="h-4 w-4 text-slate-600" />
                )}
              </button>

              {/* Notifications Dropdown */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  aria-label="Notifications"
                  className="relative grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#f45a2c] text-[9px] font-black text-white shadow-sm">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {isNotificationsOpen && (
                  <div className="absolute right-0 top-11 z-40 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-[#202020]">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={markAllNotificationsAsRead}
                          className="text-[11px] font-semibold text-[#f45a2c] hover:underline"
                        >
                          Mark all read
                        </button>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <button
                          onClick={clearNotifications}
                          className="text-[11px] text-slate-400 hover:text-slate-600"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 max-h-72 overflow-y-auto space-y-1.5">
                      {notifications.length > 0 ? (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => {
                              markNotificationAsRead(n.id);
                              if (n.link) {
                                router.push(n.link);
                                setIsNotificationsOpen(false);
                              }
                            }}
                            className={cn(
                              'group flex cursor-pointer items-start gap-3 rounded-xl p-2.5 transition',
                              !n.read
                                ? 'bg-orange-50/60 dark:bg-orange-950/20'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            )}
                          >
                            <span
                              className={cn(
                                'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold',
                                n.type === 'success'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                              )}
                            >
                              <Sparkles className="h-3 w-3" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                                  {n.title}
                                </p>
                                <span className="text-[10px] text-slate-400 shrink-0">{n.time}</span>
                              </div>
                              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                                {n.message}
                              </p>
                            </div>
                            {!n.read && (
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#f45a2c]" />
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-xs text-slate-400">
                          No notifications right now.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Direct Settings Shortcut */}
              <Link
                href="/settings"
                aria-label="Settings shortcut"
                className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </Link>

              <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />

              {/* Profile Dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 rounded-xl p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#ffe0d5] text-xs font-bold text-[#ed582e] dark:bg-orange-950 dark:text-orange-300">
                    {settings.teacherName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="hidden text-left sm:block">
                    <p className="text-xs font-bold leading-none text-slate-800 dark:text-slate-200">
                      {settings.teacherName}
                    </p>
                    <p className="text-[10px] text-slate-400">Teacher Workspace</p>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 top-11 z-40 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-[#202020]">
                    <div className="border-b border-slate-100 p-2 dark:border-slate-800">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {settings.teacherName}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{settings.email}</p>
                    </div>

                    <div className="mt-1 space-y-0.5">
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          setIsProfileModalOpen(true);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                      >
                        <User className="h-4 w-4 text-slate-400" />
                        <span>Teacher Profile</span>
                      </button>

                      <Link
                        href="/settings"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                      >
                        <Sliders className="h-4 w-4 text-slate-400" />
                        <span>Preferences</span>
                      </Link>

                      <Link
                        href="/help"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                      >
                        <HelpCircle className="h-4 w-4 text-slate-400" />
                        <span>Help & Support</span>
                      </Link>
                    </div>

                    <div className="mt-1 border-t border-slate-100 pt-1 dark:border-slate-800">
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          setIsLogoutModalOpen(true);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 transition"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* PAGE CONTENT */}
          <div className="flex-1">{children}</div>
        </div>
      </div>

      {/* TEACHER PROFILE MODAL */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsProfileModalOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-[#1e1e1e]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold">Teacher Profile</h3>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-orange-100 text-xl font-bold text-[#f45a2c] dark:bg-orange-950 dark:text-orange-300">
                  {settings.teacherName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-sm">{settings.teacherName}</h4>
                  <p className="text-xs text-slate-500">{settings.institutionName}</p>
                  <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Active Teacher Account
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Email:</span>
                  <span className="font-semibold">{settings.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Primary Subject:</span>
                  <span className="font-semibold">{settings.subjectDefault}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Assessments Evaluated:</span>
                  <span className="font-semibold">{assessments.length} files</span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Link
                href="/settings"
                onClick={() => setIsProfileModalOpen(false)}
                className="rounded-xl bg-[#2b2b2b] px-4 py-2 text-xs font-semibold text-white hover:bg-black transition"
              >
                Edit in Settings
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* LOGOUT CONFIRMATION MODAL */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsLogoutModalOpen(false)}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-[#1e1e1e]">
            <h3 className="text-base font-bold">Sign Out</h3>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Are you sure you want to sign out from the teacher workspace? Your local assessments
              will remain saved.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setIsLogoutModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsLogoutModalOpen(false);
                  addToast({
                    title: 'Signed Out',
                    description: 'You are now viewing the workspace as Guest.',
                    type: 'info',
                  });
                }}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition"
              >
                Confirm Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
