import { AuthGuard } from '@/features/authentication/ui/auth-guard';
import { Sidebar } from '@/features/dashboard/ui/sidebar';
import { TopBar } from '@/features/dashboard/ui/top-bar';
import { ErrorBoundary } from '@/components/shared/error-boundary';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
