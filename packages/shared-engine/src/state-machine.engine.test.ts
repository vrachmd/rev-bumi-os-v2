import { describe, it, expect } from 'vitest';
import { canTransition, getValidNextStates } from './state-machine.engine';

describe('state-machine.engine', () => {
  it('SCHEDULED -> LOADING allowed', () => {
    expect(canTransition('SCHEDULED', 'LOADING')).toBe(true);
  });
  it('SCHEDULED -> DELIVERED not allowed', () => {
    expect(canTransition('SCHEDULED', 'DELIVERED')).toBe(false);
  });
  it('LOADING -> IN_TRANSIT allowed', () => {
    expect(canTransition('LOADING', 'IN_TRANSIT')).toBe(true);
  });
  it('IN_TRANSIT -> ARRIVED -> UNLOADED -> POD_SUBMITTED chain', () => {
    expect(canTransition('IN_TRANSIT', 'ARRIVED')).toBe(true);
    expect(canTransition('ARRIVED', 'UNLOADED')).toBe(true);
    expect(canTransition('UNLOADED', 'POD_SUBMITTED')).toBe(true);
  });
  it('POD_SUBMITTED -> POD_VERIFIED -> DELIVERED', () => {
    expect(canTransition('POD_SUBMITTED', 'POD_VERIFIED')).toBe(true);
    expect(canTransition('POD_VERIFIED', 'DELIVERED')).toBe(true);
  });
  it('DELIVERED terminal → no next', () => {
    expect(getValidNextStates('DELIVERED')).toEqual([]);
  });
  it('CANCELLED allowed from early states', () => {
    expect(canTransition('SCHEDULED', 'CANCELLED')).toBe(true);
    expect(canTransition('LOADING', 'CANCELLED')).toBe(true);
  });
});
