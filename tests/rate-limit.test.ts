import { describe, expect, it } from 'vitest';
import { claimRollingWindow } from '../src/shared/rateLimit';

describe('rolling task-fetch limit', () => {
  it('allows five two-call captures per minute and rejects the sixth', () => {
    const now = 10_000;
    let timestamps: number[] = [];
    for (let index = 0; index < 5; index++) {
      const claim = claimRollingWindow(timestamps, now + index, 5, 60_000);
      expect(claim.allowed).toBe(true);
      timestamps = claim.timestamps;
    }
    expect(claimRollingWindow(timestamps, now + 5, 5, 60_000).allowed).toBe(false);
  });

  it('drops expired, malformed, and future values', () => {
    expect(claimRollingWindow([1, 'x', 200_000], 100_000, 5, 60_000)).toEqual({
      allowed: true,
      timestamps: [100_000]
    });
  });
});
