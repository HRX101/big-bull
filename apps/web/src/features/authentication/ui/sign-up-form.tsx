'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { signUpSchema } from '@car-spa/domain';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSignUp } from '@/features/authentication/hooks/use-auth-mutations';
import { AUTH_ROUTES } from '@car-spa/shared';

export function SignUpForm() {
  const router = useRouter();
  const signUp = useSignUp();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(signUpSchema) });

  const onSubmit = handleSubmit(async (data) => {
    const result = await signUp.mutateAsync(data);
    if (result.success) router.push(AUTH_ROUTES.verifyEmail);
  });

  return (
    <Card className="border-border/60 bg-card/80 w-full max-w-md backdrop-blur">
      <CardHeader>
        <p className="font-display text-3xl tracking-tight">Big Bull Car Spa</p>
        <CardTitle className="text-muted-foreground text-base font-normal">
          Create your account
        </CardTitle>
        <CardDescription>Start managing your automotive workshop.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Full name</Label>
            <Input id="displayName" {...register('displayName')} />
            {errors.displayName && (
              <p className="text-destructive text-sm">{errors.displayName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-destructive text-sm">{errors.password.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-destructive text-sm">{errors.confirmPassword.message}</p>
            )}
          </div>
          {signUp.data && !signUp.data.success && (
            <p className="text-destructive text-sm">{signUp.data.error.message}</p>
          )}
          {signUp.error && <p className="text-destructive text-sm">{signUp.error.message}</p>}
          <Button type="submit" className="w-full" disabled={signUp.isPending}>
            {signUp.isPending ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
        <p className="text-muted-foreground mt-4 text-center text-sm">
          Already have an account?{' '}
          <Link href={AUTH_ROUTES.signIn} className="hover:text-foreground">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
