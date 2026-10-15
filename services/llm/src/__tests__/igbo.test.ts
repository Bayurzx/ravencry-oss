/**
 * T-030 · Igbo extraction test
 *
 * "Ada m Chiamaka efu na ọ̀chà Onitsha. Ọ nọ n'afọ iri na abụọ, ọ na-eyi ákwá ọcha."
 *
 * Expect: name=Chiamaka, age≥10, gender=female, location=Onitsha, language=igbo
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

describe('POST /extract — Igbo report', () => {
  it('extracts Chiamaka, ~12, female, Onitsha', async () => {
    mockComplete.mockResolvedValue({
      parsed: {
        person_name: 'Chiamaka',
        age_estimate: 12,
        age_unit: 'years',
        gender: 'female',
        clothing_desc: 'white cloth',
        distinguishing_features: null,
        circumstance: 'missing',
        last_seen_location: 'Onitsha',
        last_seen_lga: null,
        last_seen_state: 'Anambra',
        last_seen_time: null,
        reporter_relationship: 'parent',
        num_victims: 1,
        weapons_mentioned: [],
        vehicle_mentioned: null,
        language_detected: 'igbo',
        confidence: 0.88,
        missing_critical_fields: ['last_seen_time'],
      },
    });

    const res = await request(app)
      .post('/extract')
      .send({
        text: "Ada m Chiamaka efu na ọ̀chà Onitsha. Ọ nọ n'afọ iri na abụọ, ọ na-eyi ákwá ọcha.",
        language: 'ig',
      })
      .expect(200);

    expect(res.body.person_name).toBe('Chiamaka');
    // age_estimate from "iri na abụọ" (twelve) — should be ≥10
    expect(res.body.age_estimate).toBeGreaterThanOrEqual(10);
    expect(res.body.gender).toBe('female');
    expect(res.body.language_detected).toBe('igbo');
    expect(res.body.last_seen_location).toContain('Onitsha');
    expect(res.body.missing_critical_fields).toContain('last_seen_time');
  });
});
