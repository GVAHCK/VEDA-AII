import { Suspense } from 'react';
import { AppShell } from '@/components/app-shell';
import { ExtractView } from '@/components/extract-view';
import { Providers } from '@/components/providers';

export default function UploadPage() {
  return (
    <Providers>
      <AppShell>
        <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading upload studio...</div>}>
          <ExtractView />
        </Suspense>
      </AppShell>
    </Providers>
  );
}
