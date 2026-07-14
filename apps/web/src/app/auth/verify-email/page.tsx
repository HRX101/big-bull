'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AUTH_ROUTES } from '@car-spa/shared';

export default function VerifyEmailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="border-border/60 bg-card/80 w-full max-w-md backdrop-blur">
        <CardHeader>
          <CardTitle>Verify your email</CardTitle>
          <CardDescription>
            We sent a verification link to your inbox. Please verify before continuing to
            onboarding.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href={AUTH_ROUTES.onboarding}>I have verified my email</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
