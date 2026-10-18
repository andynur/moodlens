export interface WindowClaim {
  allowed: boolean;
  timestamps: number[];
}

/** Pure rolling-window limiter. Malformed/future timestamps are discarded instead of trusted. */
export function claimRollingWindow(input: unknown, now: number, maximum: number, windowMs: number): WindowClaim {
  const timestamps = Array.isArray(input)
    ? input.filter(
        (value): value is number =>
          typeof value === 'number' && Number.isFinite(value) && value <= now && value > now - windowMs
      )
    : [];
  if (timestamps.length >= maximum) return { allowed: false, timestamps: timestamps.slice(-maximum) };
  return { allowed: true, timestamps: [...timestamps, now] };
}
