/**
 * T-030 · Nigerian Pidgin extraction test
 *
 * "Dem don kidnap my pikin for Kaduna-Abuja road near Katari.
 *  E be small boy, maybe 7 years. E dey wear red shirt. This morning 6am."
 *
 * Expect: name=null, age=7, gender=male, location=Kaduna-Abuja road, Katari,
 *         circumstance=abduction, language=pidgin
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';

vi.mock('../client', () => ({
  getLLMProvider: vi.fn(),
  resetLLMProvider: vi.fn(),
}));

import { getLLMProvider } from '../client';

const mockComplete = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (getLLMProvider as any).mockResolvedValue({
    name: 'mock',
    defaultModel: 'mock-model',
    cheapModel: 'mock-turbo',
    accurateModel: 'mock-plus',
    complete: mockComplete,
  });
});

describe('POST /extract — Pidgin report', () => {
  it('extracts male child ~7, Kaduna-Abuja road, abduction', async () => {
    mockComplete.mockResolvedValue({
      parsed: {
        person_name: null,
        age_estimate: 7,
        age_unit: 'years',
        gender: 'male',
        clothing_desc: 'red shirt',
        distinguishing_features: null,
        circumstance: 'abduction',
        last_seen_location: 'Kaduna-Abuja road, near Katari',
        last_seen_lga: null,
        last_seen_state: null,
        last_seen_time: '2026-06-22T06:00:00+01:00',
        reporter_relationship: 'parent',
        num_victims: 1,
        weapons_mentioned: [],
        vehicle_mentioned: null,
        language_detected: 'pidgin',
        confidence: 0.85,
        missing_critical_fields: ['person_name'],
      },
    });

    const res = await request(app)
      .post('/extract')
      .send({
        text: 'Dem don kidnap my pikin for Kaduna-Abuja road near Katari. E be small boy, maybe 7 years. E dey wear red shirt. This morning 6am.',
        language: 'pcm',
      })
      .expect(200);

    expect(res.body.age_estimate).toBe(7);
    expect(res.body.gender).toBe('male');
    expect(res.body.circumstance).toBe('abduction');
    expect(res.body.language_detected).toBe('pidgin');
    expect(res.body.last_seen_location).toContain('Kaduna-Abuja');
    expect(res.body.clothing_desc).toContain('red');
    // name is unknown — "my pikin" doesn't give a name
    expect(res.body.person_name).toBeNull();
    expect(res.body.missing_critical_fields).toContain('person_name');
  });
});
