'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema } from '@car-spa/domain';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForgotPassword } from '@/features/authentication/hooks/use-auth-mutations';
import { AUTH_ROUTES } from '@car-spa/shared';

export function ForgotPasswordForm() {
  const forgotPassword = useForgotPassword();
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = handleSubmit(async (data) => {
    await forgotPassword.mutateAsync(data.email);
    setSent(true);
  });

  return (
    <Card className="border-border/60 bg-card/80 w-full max-w-md backdrop-blur">
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>We will email you a link to reset your password.</CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <p className="text-muted-foreground text-sm">
            If an account exists for that email, a reset link has been sent.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={forgotPassword.isPending}>
              Send reset link
            </Button>
          </form>
        )}
        <Link
          href={AUTH_ROUTES.signIn}
          className="text-muted-foreground hover:text-foreground mt-4 block text-sm"
        >
          Back to sign in
        </Link>
      </CardContent>
    </Card>
  );
}
