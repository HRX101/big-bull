'use client';

import { useAuthStore } from '@/features/authentication/stores/auth-store';
import {
  UsersRound,
  Plus,
  UserCheck,
  UserX,
  Calendar,
  Check,
  X,
  DollarSign,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { PaginationControls } from '@/components/shared/pagination';
import {
  useEmployees,
  useToggleEmployeeStatus,
  useLeaveRequests,
  useMyLeaveRequests,
  useReviewLeaveRequest,
} from '../api/use-employees';
import { AddEmployeeDialog } from './add-employee-dialog';
import { LeaveRequestDialog } from './leave-request-dialog';
import { SalarySection } from './salary-section';
import type { UserProfile, Membership } from '@car-spa/domain';

type Tab = 'employees' | 'leave-requests' | 'salary';

const STATUS_BG: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const LEAVE_PAGE_SIZE = 5;
const EMPLOYEE_PAGE_SIZE = 5;

export function EmployeesPage() {
  const session = useAuthStore((s) => s.session);
  const orgId = session?.orgId ?? '';
  const userId = session?.userId ?? '';
  const isOwner = session?.role === 'owner';

  const [tab, setTab] = useState<Tab>(isOwner ? 'employees' : 'leave-requests');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leavePage, setLeavePage] = useState(0);
  const [employeePage, setEmployeePage] = useState(0);

  const employeesQuery = useEmployees(orgId);
  const toggleStatus = useToggleEmployeeStatus();
  const leaveRequestsQuery = useLeaveRequests(orgId);
  const myLeaveRequestsQuery = useMyLeaveRequests(userId);
  const reviewLeaveRequest = useReviewLeaveRequest();

  const employees = employeesQuery.data ?? [];
  const allLeaveRequests = leaveRequestsQuery.data ?? [];
  const myLeaveRequests = myLeaveRequestsQuery.data ?? [];

  const leaveData = isOwner ? allLeaveRequests : myLeaveRequests;
  const leaveLoading = isOwner ? leaveRequestsQuery.isLoading : myLeaveRequestsQuery.isLoading;
  const leaveTotalPages = Math.max(1, Math.ceil(leaveData.length / LEAVE_PAGE_SIZE));
  const safeLeavePage = Math.min(leavePage, leaveTotalPages - 1);
  const pagedLeaveData = leaveData.slice(
    safeLeavePage * LEAVE_PAGE_SIZE,
    (safeLeavePage + 1) * LEAVE_PAGE_SIZE,
  );

  const employeeTotalPages = Math.max(1, Math.ceil(employees.length / EMPLOYEE_PAGE_SIZE));
  const safeEmployeePage = Math.min(employeePage, employeeTotalPages - 1);
  const pagedEmployees = employees.slice(
    safeEmployeePage * EMPLOYEE_PAGE_SIZE,
    (safeEmployeePage + 1) * EMPLOYEE_PAGE_SIZE,
  );

  const statusLabel: Record<string, string> = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
  };

  const leaveTypeLabel: Record<string, string> = {
    UNPAID: 'Unpaid',
    PAID: 'Paid',
    SICK: 'Sick',
  };

  function getEmployeeName(employeeId: string) {
    return employees.find((e) => e.id === employeeId)?.displayName ?? 'Unknown';
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={isOwner ? 'Team' : 'Portal'}
        title={isOwner ? 'Employees' : 'My Portal'}
        description={
          isOwner
            ? 'Manage your team and their requests.'
            : 'Your leaves, salary and credited payments.'
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            {isOwner && (
              <Button
                className="bg-gradient-to-r from-sky-600 to-blue-600 shadow-md shadow-blue-900/25 hover:from-sky-500 hover:to-blue-500"
                onClick={() => setAddDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
            )}
            {!isOwner && (
              <Button
                className="bg-gradient-to-r from-sky-600 to-blue-600 shadow-md shadow-blue-900/25 hover:from-sky-500 hover:to-blue-500"
                onClick={() => setLeaveDialogOpen(true)}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Request Leave
              </Button>
            )}
          </div>
        }
      />

      <div className="bg-muted inline-flex max-w-full overflow-x-auto rounded-md p-0.5">
        {isOwner && (
          <button
            onClick={() => setTab('employees')}
            className={`inline-flex shrink-0 items-center gap-2 rounded-sm px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              tab === 'employees'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <UsersRound className="h-4 w-4" />
            Employees
          </button>
        )}
        <button
          onClick={() => setTab('leave-requests')}
          className={`inline-flex shrink-0 items-center gap-2 rounded-sm px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
            tab === 'leave-requests'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Calendar className="h-4 w-4" />
          Leave Requests
        </button>
        <button
          onClick={() => setTab('salary')}
          className={`inline-flex shrink-0 items-center gap-2 rounded-sm px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
            tab === 'salary'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <DollarSign className="h-4 w-4" />
          {isOwner ? 'Salary' : 'My Salary'}
        </button>
      </div>

      {tab === 'employees' ? (
        <>
          {employeesQuery.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="space-y-3 p-4">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : employees.length === 0 ? (
            <EmptyState
              title="No employees"
              description="Add your first employee to get started."
              action={
                <Button onClick={() => setAddDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Employee
                </Button>
              }
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pagedEmployees.map((emp) => (
                  <EmployeeCard
                    key={emp.id}
                    employee={emp}
                    membership={emp.membership}
                    onToggleStatus={(membershipId, active) =>
                      toggleStatus.mutate({ membershipId, active })
                    }
                  />
                ))}
              </div>
              <PaginationControls
                page={safeEmployeePage}
                totalPages={employeeTotalPages}
                onPageChange={setEmployeePage}
                itemCount={employees.length}
                itemLabel="employees"
              />
            </>
          )}
        </>
      ) : tab === 'salary' ? (
        <SalarySection orgId={orgId} isOwner={isOwner} employeeId={isOwner ? undefined : userId} />
      ) : (
        <div className="space-y-4">
          {!isOwner && (
            <div className="flex justify-end">
              <Button onClick={() => setLeaveDialogOpen(true)}>
                <Calendar className="mr-2 h-4 w-4" />
                Request Leave
              </Button>
            </div>
          )}

          {leaveLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : leaveData.length === 0 ? (
            <EmptyState
              title="No leave requests"
              description={
                isOwner
                  ? 'No employees have submitted leave requests yet.'
                  : 'You have not submitted any leave requests.'
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {isOwner && <th className="px-4 py-3 text-left font-medium">Employee</th>}
                    <th className="px-4 py-3 text-left font-medium">Type</th>
                    <th className="px-4 py-3 text-left font-medium">Dates</th>
                    <th className="px-4 py-3 text-left font-medium">Reason</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    {isOwner && <th className="px-4 py-3 text-right font-medium">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {pagedLeaveData.map((lr) => (
                    <tr key={lr.id} className="group hover:bg-muted/30">
                      {isOwner && (
                        <td className="px-4 py-3 font-medium">{getEmployeeName(lr.employeeId)}</td>
                      )}
                      <td className="text-muted-foreground px-4 py-3">
                        {leaveTypeLabel[lr.leaveType] ?? lr.leaveType}
                      </td>
                      <td className="text-muted-foreground px-4 py-3">
                        {new Date(lr.fromDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                        })}
                        {' – '}
                        {new Date(lr.toDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="text-muted-foreground max-w-[200px] truncate px-4 py-3">
                        {lr.reason ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            STATUS_BG[lr.status] ?? 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {statusLabel[lr.status] ?? lr.status}
                        </span>
                      </td>
                      {isOwner && (
                        <td className="px-4 py-3 text-right">
                          {lr.status === 'PENDING' && (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:text-green-700"
                                disabled={reviewLeaveRequest.isPending}
                                onClick={() =>
                                  reviewLeaveRequest.mutate({ leaveId: lr.id, status: 'APPROVED' })
                                }
                              >
                                <Check className="h-4 w-4" />
                                Approve
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                disabled={reviewLeaveRequest.isPending}
                                onClick={() =>
                                  reviewLeaveRequest.mutate({ leaveId: lr.id, status: 'REJECTED' })
                                }
                              >
                                <X className="h-4 w-4" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {leaveTotalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-muted-foreground text-xs">
                Page {safeLeavePage + 1} of {leaveTotalPages} · {leaveData.length} requests
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safeLeavePage === 0}
                  onClick={() => setLeavePage((p) => Math.max(0, p - 1))}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safeLeavePage >= leaveTotalPages - 1}
                  onClick={() => setLeavePage((p) => Math.min(leaveTotalPages - 1, p + 1))}
                  aria-label="Next page"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <AddEmployeeDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />

      <LeaveRequestDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen} />
    </div>
  );
}

function EmployeeCard({
  employee,
  membership,
  onToggleStatus,
}: {
  employee: UserProfile;
  membership: Membership | null;
  onToggleStatus: (membershipId: string, active: boolean) => void;
}) {
  const isActive = membership
    ? (membership as Membership & { active?: boolean }).active !== false
    : true;

  return (
    <Card className="hover:border-muted-foreground/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
            <UsersRound className="text-muted-foreground h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{employee.displayName}</p>
            <p className="text-muted-foreground truncate text-sm">{employee.email}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium capitalize">
              {employee.role ?? 'employee'}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                isActive
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}
            >
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          {membership && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleStatus(membership.id, !isActive)}
            >
              {isActive ? (
                <UserX className="h-4 w-4 text-red-500" />
              ) : (
                <UserCheck className="h-4 w-4 text-green-500" />
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
