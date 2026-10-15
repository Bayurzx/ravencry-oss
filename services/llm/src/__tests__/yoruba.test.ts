/**
 * T-030 · Yoruba extraction test
 *
 * "Omo mi sonu ni ọja Mile 12 Lagos lana alẹ.
 *  Orukọ rẹ ni Tolu, ọmọ ọdun 12, obirin."
 *
 * Expect: name=Tolu, age=12, gender=female, location=Mile 12, Lagos, language=yoruba
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

describe('POST /extract — Yoruba report', () => {
  it('extracts Tolu, age 12, female, Mile 12 Lagos', async () => {
    mockComplete.mockResolvedValue({
      parsed: {
        person_name: 'Tolu',
        age_estimate: 12,
        age_unit: 'years',
        gender: 'female',
        clothing_desc: null,
        distinguishing_features: null,
        circumstance: 'missing',
        last_seen_location: 'Mile 12, Lagos',
        last_seen_lga: null,
        last_seen_state: 'Lagos',
        last_seen_time: '2026-06-21T20:00:00+01:00',
        reporter_relationship: 'parent',
        num_victims: 1,
        weapons_mentioned: [],
        vehicle_mentioned: null,
        language_detected: 'yoruba',
        confidence: 0.92,
        missing_critical_fields: [],
      },
    });

    const res = await request(app)
      .post('/extract')
      .send({
        text: 'Omo mi sonu ni ọja Mile 12 Lagos lana alẹ. Orukọ rẹ ni Tolu, ọmọ ọdun 12, obirin.',
        language: 'yo',
      })
      .expect(200);

    expect(res.body.person_name).toBe('Tolu');
    expect(res.body.age_estimate).toBe(12);
    expect(res.body.gender).toBe('female');
    expect(res.body.language_detected).toBe('yoruba');
    expect(res.body.last_seen_location).toContain('Lagos');
    expect(res.body.circumstance).toBe('missing');
  });
});
