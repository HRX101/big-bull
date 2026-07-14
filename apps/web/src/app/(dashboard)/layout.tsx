import { AuthGuard } from '@/features/authentication/ui/auth-guard';
import { Sidebar } from '@/features/dashboard/ui/sidebar';
import { TopBar } from '@/features/dashboard/ui/top-bar';
import { ErrorBoundary } from '@/components/shared/error-boundary';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <TopBar />
          <main className="flex-1 p-8">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
