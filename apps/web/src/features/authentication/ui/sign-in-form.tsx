'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { signInSchema } from '@car-spa/domain';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGoogleSignIn, useSignIn } from '@/features/authentication/hooks/use-auth-mutations';
import { PROTECTED_ROUTES } from '@car-spa/shared';

export function SignInForm() {
  const router = useRouter();
  const signIn = useSignIn();
  const googleSignIn = useGoogleSignIn();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(signInSchema) });

  const onSubmit = handleSubmit(async (data) => {
    const result = await signIn.mutateAsync(data);
    if (result.success) router.push(PROTECTED_ROUTES.dashboard);
  });

  return (
    <Card className="border-border/60 bg-card/80 w-full max-w-md backdrop-blur">
      <CardHeader>
        <p className="font-display text-3xl tracking-tight">Big Bull Car Spa</p>
        <CardTitle className="text-muted-foreground text-base font-normal">
          Sign in to your workshop
        </CardTitle>
        <CardDescription>Manage vehicles, inventory, and operations in one place.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={onSubmit} className="space-y-4">
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
              autoComplete="current-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-destructive text-sm">{errors.password.message}</p>
            )}
          </div>
          {signIn.error && <p className="text-destructive text-sm">{signIn.error.message}</p>}
          <Button type="submit" className="w-full" disabled={signIn.isPending}>
            {signIn.isPending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={googleSignIn.isPending}
          onClick={async () => {
            await googleSignIn.mutateAsync();
            router.push(PROTECTED_ROUTES.dashboard);
          }}
        >
          Continue with Google
        </Button>
        <div className="text-muted-foreground flex justify-between text-sm">
          <Link href="/auth/forgot-password" className="hover:text-foreground">
            Forgot password?
          </Link>
          <Link href="/auth/sign-up" className="hover:text-foreground">
            Create account
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
