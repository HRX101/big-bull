'use client';

import { normalizeIndianMobile } from '@car-spa/domain';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface IndiaPhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  id?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  size?: 'default' | 'sm';
}

export const IndiaPhoneInput = forwardRef<HTMLInputElement, IndiaPhoneInputProps>(
  (
    {
      value = '',
      onChange,
      onBlur,
      id,
      placeholder = '98765 43210',
      className,
      disabled,
      size = 'default',
    },
    ref,
  ) => {
    const digits = normalizeIndianMobile(value).slice(0, 10);
    const height = size === 'sm' ? 'h-9' : 'h-10';

    return (
      <div className={cn('flex', className)}>
        <div
          className={cn(
            'border-input bg-muted/50 text-muted-foreground flex shrink-0 items-center gap-2 rounded-l-md border border-r-0 px-3 text-sm',
            height,
          )}
          aria-hidden="true"
        >
          <span className="text-base leading-none">🇮🇳</span>
          <span className="font-medium">+91</span>
        </div>
        <input
          ref={ref}
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={10}
          disabled={disabled}
          placeholder={placeholder}
          value={digits}
          onBlur={onBlur}
          onChange={(e) => {
            const nextDigits = e.target.value.replace(/\D/g, '').slice(0, 10);
            onChange?.(nextDigits.length > 0 ? `+91${nextDigits}` : '');
          }}
          className={cn(
            'border-input bg-input ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-r-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
            height,
          )}
        />
      </div>
    );
  },
);

IndiaPhoneInput.displayName = 'IndiaPhoneInput';
