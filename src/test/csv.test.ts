import { describe, expect, it } from 'vitest';
import { csvCell, serializeCsv } from '@/lib/csv';

describe('CSV export', () => {
  it('escapes separators, quotes, newlines and accents', () => {
    expect(serializeCsv([['NF;1', 'Placa "A"', 'São Paulo\nBase']])).toBe('"NF;1";"Placa ""A""";"São Paulo\nBase"');
  });
  it.each(['=1+1', '+SUM(A1)', '-1+2', '@SUM(A1)', '  =1', '\t=1', '\r\n+1'])('neutralizes formula text %j', value => {
    expect(csvCell(value)).toBe("\"'" + value + '"');
  });
  it('preserves numeric negatives and zero', () => {
    expect(serializeCsv([[-150, 0, 1.5, null]])).toBe('-150;0;1.5;""');
  });
  it('uses consistent row boundaries', () => {
    expect(serializeCsv([['NF'], ['123']])).toBe('"NF"\r\n"123"');
  });
  it('rejects non-finite numbers', () => expect(() => csvCell(Infinity)).toThrow());
});
