/**
 * T-030 · Code-switching / Mixed language extraction test
 *
 * "My son Emeka (age 8) don miss since yesterday.
 *  I last see am at Total filling station Ajah Lagos around 4pm yesterday."
 *
 * Expect: name=Emeka, age=8, gender=male, location=Total filling station, Ajah, Lagos,
 *         language=mixed
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

describe('POST /extract — Mixed code-switching report', () => {
  it('extracts Emeka, age 8, male, Ajah Lagos', async () => {
    mockComplete.mockResolvedValue({
      parsed: {
        person_name: 'Emeka',
        age_estimate: 8,
        age_unit: 'years',
        gender: 'male',
        clothing_desc: null,
        distinguishing_features: null,
        circumstance: 'missing',
        last_seen_location: 'Total filling station, Ajah, Lagos',
        last_seen_lga: 'Eti-Osa',
        last_seen_state: 'Lagos',
        last_seen_time: '2026-06-21T16:00:00+01:00',
        reporter_relationship: 'parent',
        num_victims: 1,
        weapons_mentioned: [],
        vehicle_mentioned: null,
        language_detected: 'mixed',
        confidence: 0.9,
        missing_critical_fields: [],
      },
    });

    const res = await request(app)
      .post('/extract')
      .send({
        text: 'My son Emeka (age 8) don miss since yesterday. I last see am at Total filling station Ajah Lagos around 4pm yesterday.',
        language: 'auto',
      })
      .expect(200);

    expect(res.body.person_name).toBe('Emeka');
    expect(res.body.age_estimate).toBe(8);
    expect(res.body.gender).toBe('male');
    expect(res.body.language_detected).toBe('mixed');
    expect(res.body.last_seen_location).toContain('Ajah');
    expect(res.body.last_seen_location).toContain('Lagos');
    expect(res.body.last_seen_state).toBe('Lagos');
    expect(res.body.last_seen_lga).toBe('Eti-Osa');
  });
});
