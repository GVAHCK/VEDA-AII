import { AppShell } from '@/components/app-shell';
import { SettingsView } from '@/components/settings-view';
import { Providers } from '@/components/providers';

export default function SettingsPage() {
  return (
    <Providers>
      <AppShell>
        <SettingsView />
      </AppShell>
    </Providers>
  );
}
