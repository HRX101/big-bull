'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { bootstrapOrgSchema } from '@car-spa/domain';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBootstrapOrg } from '@/features/authentication/hooks/use-auth-mutations';
import { useAuthStore } from '@/features/authentication/stores/auth-store';
import { PROTECTED_ROUTES } from '@car-spa/shared';

export function OnboardingForm() {
  const router = useRouter();
  const bootstrap = useBootstrapOrg();
  const setSession = useAuthStore((s) => s.setSession);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(bootstrapOrgSchema),
    defaultValues: { orgName: process.env.NEXT_PUBLIC_DEFAULT_ORG_NAME ?? 'Big Bull Car Spa' },
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      const result = await bootstrap.mutateAsync(data);
      if (result.success) {
        setSession(result.value);
        router.push(PROTECTED_ROUTES.dashboard);
      }
    } catch {
      // Mutation errors surface via bootstrap.error below.
    }
  });

  return (
    <Card className="border-border/60 bg-card/80 w-full max-w-md backdrop-blur">
      <CardHeader>
        <p className="font-display text-3xl tracking-tight">Big Bull Car Spa</p>
        <CardTitle className="text-muted-foreground text-base font-normal">
          Set up your workshop
        </CardTitle>
        <CardDescription>Create your default organization to get started.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orgName">Workshop name</Label>
            <Input id="orgName" {...register('orgName')} />
            {errors.orgName && <p className="text-destructive text-sm">{errors.orgName.message}</p>}
          </div>
          {!bootstrap.data?.success && bootstrap.data && (
            <p className="text-destructive text-sm">{bootstrap.data.error.message}</p>
          )}
          {bootstrap.error && <p className="text-destructive text-sm">{bootstrap.error.message}</p>}
          <Button type="submit" className="w-full" disabled={bootstrap.isPending}>
            {bootstrap.isPending ? 'Setting up…' : 'Continue to dashboard'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
