'use client';

import { Printer, X } from 'lucide-react';
import type { SalaryRecord } from '@car-spa/domain';
import { getStoreSettingsUseCase } from '@car-spa/infrastructure';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import type { EmployeeWithMembership } from '../api/use-employees';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  PAID: 'Paid',
};

function formatRupee(amount: number) {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Divider() {
  return <div className="my-4 border-t border-dashed border-neutral-300" />;
}

export function PayslipModal({
  record,
  employee,
  orgId,
  onClose,
}: {
  record: SalaryRecord | null;
  employee: EmployeeWithMembership | undefined;
  orgId: string;
  onClose: () => void;
}) {
  const { data: storeSettings } = useQuery({
    queryKey: ['storeSettings', orgId],
    queryFn: () => getStoreSettingsUseCase.execute(orgId),
    enabled: !!orgId,
  });

  if (!record) return null;

  const storeName = storeSettings?.storeName ?? 'Big Bull Car Spa';
  const storeAddress = storeSettings?.address ?? null;
  const period = new Date(record.year, record.month - 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
  const issueDate = new Date(record.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <>
      <style>{`
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          body * { visibility: hidden !important; }
          #payslip-print, #payslip-print * { visibility: visible !important; }
          #payslip-print {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            margin: 0;
            padding: 16px;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: #fff !important;
            color: #000 !important;
          }
          #payslip-print * { color: #000 !important; background: transparent !important; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/70 p-4 backdrop-blur-sm">
        <div
          id="payslip-print"
          className="w-full max-w-md rounded-lg border bg-white p-6 text-neutral-900 shadow-2xl shadow-black/40"
        >
          <div className="flex items-start justify-between border-b border-neutral-200 pb-4">
            <div>
              <p className="text-lg font-black tracking-tight uppercase">{storeName}</p>
              <p className="text-xs font-semibold tracking-widest text-neutral-500 uppercase">
                Salary Payment Slip
              </p>
              {storeAddress && <p className="mt-0.5 text-xs text-neutral-500">{storeAddress}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs font-bold tracking-widest text-neutral-400 uppercase">Slip</p>
              <p className="text-sm font-bold">{period}</p>
            </div>
          </div>

          <Divider />

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-neutral-500">Employee</p>
              <p className="font-semibold">{employee?.displayName ?? '—'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-neutral-500">Status</p>
              <p className="font-semibold">{STATUS_LABEL[record.status] ?? record.status}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Month</p>
              <p className="font-semibold">{period}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-neutral-500">Issued On</p>
              <p className="font-semibold">{issueDate}</p>
            </div>
          </div>

          <Divider />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-500">Full Salary</span>
              <span className="font-semibold">{formatRupee(record.fullSalary)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Working Days</span>
              <span>{record.workingDays}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Leave Days</span>
              <span>{record.leaveDays}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Per Day Rate</span>
              <span>{formatRupee(record.perDayRate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Deduction (Leave)</span>
              <span className="font-semibold text-red-600">-{formatRupee(record.deduction)}</span>
            </div>
          </div>

          <Divider />

          <div className="flex items-center justify-between">
            <span className="text-sm font-bold tracking-widest uppercase">Net Payable</span>
            <span className="text-2xl font-black">{formatRupee(record.payableAmount)}</span>
          </div>

          {record.notes && (
            <p className="mt-4 border-t border-dashed border-neutral-300 pt-2 text-xs text-neutral-500">
              Note: {record.notes}
            </p>
          )}

          <p className="mt-4 border-t border-dashed border-neutral-300 pt-2 text-center text-[10px] tracking-wider text-neutral-400">
            {storeName} · Salary Slip
          </p>
        </div>
      </div>

      <div className="no-print fixed inset-x-0 bottom-6 z-50 flex justify-center gap-2">
        <Button
          onClick={() => window.print()}
          className="bg-gradient-to-r from-blue-600 to-sky-500 shadow-lg shadow-blue-900/25 hover:from-blue-700 hover:to-sky-600"
        >
          <Printer className="mr-2 h-4 w-4" />
          Print Payslip
        </Button>
        <Button onClick={onClose} variant="outline" className="bg-background">
          <X className="mr-2 h-4 w-4" />
          Close
        </Button>
      </div>
    </>
  );
}
