/**
 * Tests for SMS Templates
 *
 * Validates message formatting for FLASH and PRIORITY alerts.
 * SMS messages must be concise for mobile delivery.
 */

import { describe, it, expect } from 'vitest';
import {
  formatFlashAlert,
  formatPriorityAlert,
  formatAlert,
  type AlertCase,
} from '../templates';

// ---- Test Data -----------------------------------------------------------

const flashCase: AlertCase = {
  case_id: 'CASE-001',
  person_name: 'Fatima Ibrahim',
  age_estimate: 9,
  gender: 'Female',
  last_seen_location: 'Zamfara Central Market',
  last_seen_state: 'Zamfara',
  last_seen_time: '2026-06-26 10:00',
  description: 'Wearing a blue hijab and white dress',
  alert_tier: 'FLASH',
};

const priorityCase: AlertCase = {
  case_id: 'CASE-002',
  person_name: 'Musa Bello',
  age_estimate: 35,
  gender: 'Male',
  last_seen_lga: 'Ikeja',
  last_seen_state: 'Lagos',
  alert_tier: 'PRIORITY',
};

const minimalCase: AlertCase = {
  case_id: 'CASE-003',
  person_name: 'Aisha',
  alert_tier: 'FLASH',
};

// ---- Tests ---------------------------------------------------------------

describe('formatFlashAlert', () => {
  it('includes person name and age', () => {
    const msg = formatFlashAlert(flashCase);
    expect(msg).toContain('Fatima Ibrahim');
    expect(msg).toContain('Age 9');
    expect(msg).toContain('Female');
  });

  it('includes location', () => {
    const msg = formatFlashAlert(flashCase);
    expect(msg).toContain('Zamfara Central Market');
    expect(msg).toContain('Zamfara');
  });

  it('includes reporting CTA', () => {
    const msg = formatFlashAlert(flashCase);
    expect(msg).toContain('*384*72836#');
  });

  it('starts with FLASH ALERT', () => {
    const msg = formatFlashAlert(flashCase);
    expect(msg.startsWith('FLASH ALERT:')).toBe(true);
  });

  it('handles minimal case data', () => {
    const msg = formatFlashAlert(minimalCase);
    expect(msg).toContain('Aisha');
    expect(msg).toContain('FLASH ALERT:');
  });

  it('produces reasonable length (under 3 SMS segments)', () => {
    const msg = formatFlashAlert(flashCase);
    expect(msg.length).toBeLessThan(460); // 3 * 153 char segments
  });
});

describe('formatPriorityAlert', () => {
  it('includes person name', () => {
    const msg = formatPriorityAlert(priorityCase);
    expect(msg).toContain('Musa Bello');
    expect(msg).toContain('(35)');
  });

  it('includes location', () => {
    const msg = formatPriorityAlert(priorityCase);
    expect(msg).toContain('Ikeja');
    expect(msg).toContain('Lagos');
  });

  it('starts with PRIORITY', () => {
    const msg = formatPriorityAlert(priorityCase);
    expect(msg.startsWith('PRIORITY:')).toBe(true);
  });

  it('fits within single SMS segment', () => {
    const msg = formatPriorityAlert(priorityCase);
    expect(msg.length).toBeLessThanOrEqual(160);
  });
});

describe('formatAlert', () => {
  it('routes FLASH to formatFlashAlert', () => {
    const msg = formatAlert(flashCase);
    expect(msg.startsWith('FLASH ALERT:')).toBe(true);
  });

  it('routes PRIORITY to formatPriorityAlert', () => {
    const msg = formatAlert(priorityCase);
    expect(msg.startsWith('PRIORITY:')).toBe(true);
  });

  it('routes ROUTINE to formatPriorityAlert (fallback)', () => {
    const msg = formatAlert({ ...priorityCase, alert_tier: 'ROUTINE' });
    expect(msg.startsWith('PRIORITY:')).toBe(true);
  });
});

describe('SMS length constraints', () => {
  it('FLASH alert fits within 6 SMS segments (max 918 chars)', () => {
    const longCase: AlertCase = {
      ...flashCase,
      description:
        'A very long description that should still fit within the maximum SMS segment count. The child was last seen wearing distinctive clothing.',
    };
    const msg = formatFlashAlert(longCase);
    expect(msg.length).toBeLessThanOrEqual(918); // 6 segments * 153
  });

  it('PRIORITY alert always fits in 1 segment (160 chars)', () => {
    const longPriority: AlertCase = {
      ...priorityCase,
      last_seen_location:
        'Very Long Location Name That Should Still Fit Within Single Segment',
    };
    const msg = formatPriorityAlert(longPriority);
    expect(msg.length).toBeLessThanOrEqual(160);
  });
});
