import { describe, expect, it } from 'vitest';
import { en } from '../src/shared/i18n/en';
import { id } from '../src/shared/i18n/id';

describe('i18n dictionaries', () => {
  it('have the same keys in en and id', () => {
    expect(Object.keys(id).sort()).toEqual(Object.keys(en).sort());
  });
  it('have no empty values', () => {
    for (const dict of [en, id]) {
      expect(Object.entries(dict).filter(([, value]) => value.trim() === '')).toEqual([]);
    }
  });
});
