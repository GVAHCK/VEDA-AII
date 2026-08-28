import { AppShell } from '@/components/app-shell';
import { DashboardView } from '@/components/dashboard-view';
import { Providers } from '@/components/providers';

export default function HomePage() {
  return (
    <Providers>
      <AppShell>
        <DashboardView />
      </AppShell>
    </Providers>
  );
}
