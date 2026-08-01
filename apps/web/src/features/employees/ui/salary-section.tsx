'use client';

import { useState } from 'react';
import { Plus, Check, DollarSign, RefreshCw, CalendarDays, PiggyBank, Wallet, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { useSalaryRecords, useMySalaryRecords, useApproveSalary } from '../api/use-salary';
import { useEmployees } from '../api/use-employees';
import { SalaryDialog } from './salary-dialog';

const STATUS_BG: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PAID: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  PAID: 'Paid',
};

interface SalarySectionProps {
  orgId: string;
  isOwner: boolean;
  employeeId?: string;
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm font-medium">{label}</p>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <p className="font-display mt-1 text-2xl tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

export function SalarySection({ orgId, isOwner, employeeId }: SalarySectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const salaryQuery = useSalaryRecords(orgId);
  const mySalaryQuery = useMySalaryRecords(employeeId ?? '');
  const employeesQuery = useEmployees(orgId);
  const approveSalary = useApproveSalary();

  const allRecords = salaryQuery.data ?? [];
  const myRecords = mySalaryQuery.data ?? [];
  const salaryRecords = isOwner ? allRecords : myRecords;
  const loading = isOwner ? salaryQuery.isLoading : mySalaryQuery.isLoading;

  const employees = employeesQuery.data ?? [];
  const myMembership = !isOwner
    ? employees.find((e) => e.id === employeeId)?.membership ?? null
    : null;

  const credited = salaryRecords.filter((r) => r.status === 'PAID');
  const totalCredited = credited.reduce((sum, r) => sum + r.payableAmount, 0);
  const lastCredited = credited[0] ?? null;

  const totalPages = Math.max(1, Math.ceil(salaryRecords.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = salaryRecords.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function getEmployeeName(employeeId: string) {
    return employees.find((e) => e.id === employeeId)?.displayName ?? 'Unknown';
  }

  return (
    <div className="space-y-4">
      {isOwner && (
        <div className="flex justify-end">
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Generate Salary
          </Button>
        </div>
      )}

      {!isOwner && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            icon={<DollarSign className="h-4 w-4" />}
            label="Monthly Salary"
            value={`₹${(myMembership?.salaryAmount ?? 0).toLocaleString('en-IN')}`}
          />
          <SummaryCard
            icon={<CalendarDays className="h-4 w-4" />}
            label="Working Days"
            value={`${myMembership?.minWorkDays ?? 26}`}
          />
          <SummaryCard
            icon={<PiggyBank className="h-4 w-4" />}
            label="Total Credited"
            value={`₹${totalCredited.toLocaleString('en-IN')}`}
          />
          <SummaryCard
            icon={<Wallet className="h-4 w-4" />}
            label="Last Credited"
            value={lastCredited ? `₹${lastCredited.payableAmount.toLocaleString('en-IN')}` : '—'}
          />
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : salaryRecords.length === 0 ? (
        <EmptyState
          title="No salary records"
          description={
            isOwner
              ? 'Generate salary records for employees to get started.'
              : 'No salary has been credited to you yet.'
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {isOwner && <th className="px-4 py-3 text-left font-medium">Employee</th>}
                  <th className="px-4 py-3 text-left font-medium">Period</th>
                  <th className="px-4 py-3 text-right font-medium">Full Salary</th>
                  <th className="px-4 py-3 text-right font-medium">Leave Days</th>
                  <th className="px-4 py-3 text-right font-medium">Deduction</th>
                  <th className="px-4 py-3 text-right font-medium">Payable</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  {!isOwner && <th className="px-4 py-3 text-left font-medium">Credited On</th>}
                  {isOwner && <th className="px-4 py-3 text-right font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.map((sr) => (
                  <tr key={sr.id} className="group hover:bg-muted/30">
                    {isOwner && (
                      <td className="px-4 py-3 font-medium">{getEmployeeName(sr.employeeId)}</td>
                    )}
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(sr.year, sr.month - 1).toLocaleDateString('en-IN', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      ₹{sr.fullSalary.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{sr.leaveDays}</td>
                    <td className="px-4 py-3 text-right text-red-600">
                      -₹{sr.deduction.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      ₹{sr.payableAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_BG[sr.status] ?? 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {STATUS_LABEL[sr.status] ?? sr.status}
                      </span>
                    </td>
                    {!isOwner && (
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(sr.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                    )}
                    {isOwner && (
                      <td className="px-4 py-3 text-right">
                        {sr.status === 'PENDING' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700"
                            disabled={approveSalary.isPending}
                            onClick={() => approveSalary.mutate({ salaryId: sr.id, status: 'APPROVED' })}
                          >
                            {approveSalary.isPending ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                            Approve
                          </Button>
                        )}
                        {sr.status === 'APPROVED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700"
                            disabled={approveSalary.isPending}
                            onClick={() => approveSalary.mutate({ salaryId: sr.id, status: 'PAID' })}
                          >
                            {approveSalary.isPending ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <DollarSign className="h-4 w-4" />
                            )}
                            Mark Paid
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-1">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">Page {safePage} of {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {isOwner && (
        <SalaryDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          employees={employees}
        />
      )}
    </div>
  );
}
