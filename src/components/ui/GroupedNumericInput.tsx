'use client';

import { useState, type ComponentProps } from 'react';
import { formatInteger, parseDigitsToNumber } from '@/src/lib/formatters';
import { inputClass } from '@/src/lib/uiClasses';

type Props = Omit<ComponentProps<'input'>, 'type' | 'value' | 'onChange' | 'inputMode'> & {
  value: string;
  onChange: (digits: string) => void;
  /** When set, parsed value must be ≥ min (after blur). */
  min?: number;
  /** When set, parsed value must be ≤ max (after blur). */
  max?: number;
};

/**
 * Text input with numeric keyboard; value is digits-only in state. Shows comma grouping when not focused.
 */
export default function GroupedNumericInput({
  value,
  onChange,
  min,
  max,
  onBlur,
  className = inputClass,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);

  const digits = value.replace(/\D/g, '');
  const clampDigits = (d: string) => {
    const n = parseDigitsToNumber(d);
    if (n == null) return '';
    let x = n;
    if (min != null && x < min) x = min;
    if (max != null && x > max) x = max;
    return String(x);
  };

  const displayValue = focused ? digits : digits ? formatInteger(Number(digits)) : '';

  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      className={className}
      value={displayValue}
      onChange={(e) => {
        const d = e.target.value.replace(/\D/g, '');
        onChange(d);
      }}
      onFocus={(e) => {
        setFocused(true);
        rest.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        const d = clampDigits(e.target.value.replace(/\D/g, ''));
        if (d !== digits) onChange(d);
        onBlur?.(e);
      }}
    />
  );
}
