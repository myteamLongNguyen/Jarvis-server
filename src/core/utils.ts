import { ValueTransformer } from 'typeorm';

/**
 * pg returns `numeric` columns as strings to avoid float precision loss.
 * Money columns should read/write as JS numbers, so every money column uses this.
 */
export const moneyTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value === null || value === undefined ? value : parseFloat(value)),
};
