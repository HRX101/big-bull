import { OnboardingForm } from '@/features/authentication/ui/onboarding-form';
import { OnboardingGuard } from '@/features/authentication/ui/onboarding-guard';

export default function OnboardingPage() {
  return (
    <OnboardingGuard>
      <main className="flex min-h-screen items-center justify-center p-6">
        <OnboardingForm />
      </main>
    </OnboardingGuard>
  );
}
