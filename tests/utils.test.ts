import { describe, it, expect, vi } from 'vitest';
import { age, distance } from '../src/lib/utils';
describe('Cálculos operativos', () => {
  it('calcula la edad antes y después del cumpleaños', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-11T12:00:00'));
    expect(age('1990-05-12')).toBe(35);
    vi.setSystemTime(new Date('2026-05-12T12:00:00'));
    expect(age('1990-05-12')).toBe(36);
    vi.useRealTimers();
  });
  it('calcula distancias GPS en metros', () => {
    expect(distance({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0 })).toBe(0);
    expect(distance({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 })).toBeCloseTo(
      111194.9,
      0,
    );
  });
});
