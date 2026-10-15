/**
 * T-030 · Hausa extraction test
 *
 * "An sace ɗana a kasuwar Sabon Gari Kano yau da safe.
 *  Sunansa Ibrahim, yana da shekara 9, yana sanya rigar makaranta mai launin shuɗi."
 *
 * Expect: name=Ibrahim, age=9, location=Sabon Gari, Kano, language=hausa, circumstance=abduction
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

describe('POST /extract — Hausa report', () => {
  it('extracts Ibrahim, age 9, Sabon Gari Kano as abduction', async () => {
    mockComplete.mockResolvedValue({
      parsed: {
        person_name: 'Ibrahim',
        age_estimate: 9,
        age_unit: 'years',
        gender: 'male',
        clothing_desc: 'blue school uniform',
        distinguishing_features: null,
        circumstance: 'abduction',
        last_seen_location: 'Sabon Gari, Kano',
        last_seen_lga: null,
        last_seen_state: 'Kano',
        last_seen_time: '2026-06-22T08:00:00+01:00',
        reporter_relationship: 'parent',
        num_victims: 1,
        weapons_mentioned: [],
        vehicle_mentioned: null,
        language_detected: 'hausa',
        confidence: 0.95,
        missing_critical_fields: [],
      },
      content: '{}',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      model: 'mock',
      provider: 'mock',
      latencyMs: 0,
    });

    const res = await request(app)
      .post('/extract')
      .send({
        text: 'An sace ɗana a kasuwar Sabon Gari Kano yau da safe. Sunansa Ibrahim, yana da shekara 9, yana sanya rigar makaranta mai launin shuɗi.',
        language: 'ha',
      })
      .expect(200);

    expect(res.body.person_name).toBe('Ibrahim');
    expect(res.body.age_estimate).toBe(9);
    expect(res.body.gender).toBe('male');
    expect(res.body.circumstance).toBe('abduction');
    expect(res.body.language_detected).toBe('hausa');
    expect(res.body.last_seen_location).toContain('Kano');
    expect(res.body.confidence).toBeGreaterThan(0.9);
  });

  it('returns defaults when LLM produces empty output', async () => {
    mockComplete.mockResolvedValue({
      parsed: null,
      content: '',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      model: 'mock',
      provider: 'mock',
      latencyMs: 0,
    });

    const res = await request(app)
      .post('/extract')
      .send({ text: '...', language: 'ha' })
      .expect(200);

    expect(res.body.person_name).toBeNull();
    expect(res.body.gender).toBe('unknown');
    expect(res.body.circumstance).toBe('unknown');
    expect(res.body.language_detected).toBe('unknown');
    expect(res.body.confidence).toBe(0);
    expect(res.body.missing_critical_fields).toEqual([]);
    expect(res.body.num_victims).toBe(1);
  });

  it('requires text field', async () => {
    await request(app)
      .post('/extract')
      .send({ language: 'ha' })
      .expect(400);
  });
});
