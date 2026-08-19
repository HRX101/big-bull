'use client';

import {
  membershipRepository,
  userRepository,
  leaveRequestRepository,
  createLeaveRequestUseCase,
  reviewLeaveRequestUseCase,
  getFirebaseAuth,
} from '@car-spa/infrastructure';
import { useAuthStore } from '@/features/authentication/stores/auth-store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createUserWithEmailAndPassword, type UserCredential } from 'firebase/auth';
import type { Membership, UserProfile } from '@car-spa/domain';

export type EmployeeWithMembership = UserProfile & { membership: Membership | null };

export function useEmployees(orgId: string) {
  return useQuery({
    queryKey: ['employees', orgId],
    queryFn: async () => {
      const [users, memberships] = await Promise.all([
        userRepository.findByOrgId(orgId, { limit: 200 }),
        membershipRepository.findByOrgId(orgId, { limit: 200 }),
      ]);
      return users.map((user) => ({
        ...user,
        membership: memberships.find((m) => m.userId === user.id) ?? null,
      })) satisfies EmployeeWithMembership[];
    },
    enabled: !!orgId,
  });
}

function friendlyAuthError(error: unknown): Error {
  const code = (error as { code?: string } | null)?.code ?? '';
  switch (code) {
    case 'auth/email-already-in-use':
      return new Error(
        'An account with this email already exists in the system. Use a different email.',
      );
    case 'auth/invalid-email':
      return new Error('Enter a valid email address.');
    case 'auth/weak-password':
      return new Error('Password must be at least 8 characters.');
    case 'auth/operation-not-allowed':
      return new Error('Account creation is currently disabled.');
    case 'auth/network-request-failed':
      return new Error('Network error. Please check your connection and try again.');
    default:
      return new Error('Could not create the employee. Please try again.');
  }
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);

  return useMutation({
    mutationFn: async (input: {
      email: string;
      password: string;
      displayName: string;
      salaryAmount?: number | null;
      minWorkDays?: number | null;
    }) => {
      if (!session?.orgId) throw new Error('No session');
      const auth = getFirebaseAuth();
      let cred: UserCredential;
      try {
        cred = await createUserWithEmailAndPassword(auth, input.email, input.password);
      } catch (error) {
        throw friendlyAuthError(error);
      }
      try {
        const userId = cred.user.uid;
        await membershipRepository.create({
          userId,
          orgId: session.orgId,
          role: 'employee',
          salaryAmount: input.salaryAmount ?? null,
          minWorkDays: input.minWorkDays ?? null,
        });
        await userRepository.upsert({
          id: userId,
          email: input.email,
          displayName: input.displayName,
          photoUrl: null,
          emailVerified: false,
          orgId: session.orgId,
          role: 'employee',
        });
        return userId;
      } catch (error) {
        await cred.user.delete().catch(() => undefined);
        throw friendlyAuthError(error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useToggleEmployeeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ membershipId, active }: { membershipId: string; active: boolean }) =>
      membershipRepository.update(membershipId, { active }),
    onSuccess: (_data, { active }) => {
      toast.success(active ? 'Employee activated' : 'Employee deactivated');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to update employee status'),
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, membershipId }: { userId: string; membershipId: string | null }) => {
      if (membershipId) await membershipRepository.delete(membershipId);
      await userRepository.delete(userId);
    },
    onSuccess: () => {
      toast.success('Employee deleted');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to delete employee'),
  });
}

export function useLeaveRequests(orgId: string) {
  return useQuery({
    queryKey: ['leave-requests', orgId],
    queryFn: () => leaveRequestRepository.findByOrgId(orgId, { limit: 200 }),
    enabled: !!orgId,
  });
}

export function useMyLeaveRequests(employeeId: string) {
  return useQuery({
    queryKey: ['leave-requests', 'my', employeeId],
    queryFn: () => leaveRequestRepository.findByEmployeeId(employeeId, { limit: 100 }),
    enabled: !!employeeId,
  });
}

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);

  return useMutation({
    mutationFn: (input: unknown) => {
      if (!session?.orgId || !session?.userId) throw new Error('No session');
      return createLeaveRequestUseCase.execute(input, session.orgId, session.userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    },
  });
}

export function useReviewLeaveRequest() {
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);

  return useMutation({
    mutationFn: ({ leaveId, status }: { leaveId: string; status: 'APPROVED' | 'REJECTED' }) => {
      if (!session?.orgId || !session?.userId) throw new Error('No session');
      return reviewLeaveRequestUseCase.execute(leaveId, status, session.orgId, session.userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    },
  });
}
