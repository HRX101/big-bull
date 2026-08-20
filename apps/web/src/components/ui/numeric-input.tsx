'use client';

import { forwardRef, useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';

interface NumericInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number;
  onChange: (value: number) => void;
}

export const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(
  ({ value, onChange, onBlur, ...props }, ref) => {
    const [display, setDisplay] = useState(String(value ?? ''));

    useEffect(() => {
      setDisplay(String(value ?? ''));
    }, [value]);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        setDisplay(raw);
        const parsed = Number(raw);
        if (!isNaN(parsed)) {
          onChange(parsed);
        }
      },
      [onChange],
    );

    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        const parsed = Number(display);
        if (isNaN(parsed)) {
          onChange(0);
          setDisplay('0');
        } else {
          onChange(parsed);
          setDisplay(String(parsed));
        }
        onBlur?.(e);
      },
      [display, onChange, onBlur],
    );

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
        {...props}
      />
    );
  },
);

NumericInput.displayName = 'NumericInput';
