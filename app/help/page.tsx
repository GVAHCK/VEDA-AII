import { AppShell } from '@/components/app-shell';
import { HelpView } from '@/components/help-view';
import { Providers } from '@/components/providers';

export default function HelpPage() {
  return (
    <Providers>
      <AppShell>
        <HelpView />
      </AppShell>
    </Providers>
  );
}
