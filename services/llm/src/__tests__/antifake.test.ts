/**
 * T-032 · QW-04 Anti-fake / Authenticity Detection Tests
 *
 * CRITICAL: Trust by default. False positives (flagging real reports as fake)
 * harm real victims. These tests validate:
 * 1. Specific, credible report → legitimate
 * 2. Generic/missing details → suspicious (not blocked, just flagged)
 * 3. Emotional + no details → hold_for_review
 * 4. Empty output → legitimate (trust by default fallback)
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

describe('POST /check-authenticity — trust by default', () => {
  it('specific credible report → legitimate, high score', async () => {
    mockComplete.mockResolvedValue({
      parsed: {
        verdict: 'legitimate',
        authenticity_score: 0.92,
        red_flags: [],
        green_flags: [
          'specific_lga_landmark',
          'consistent_time_location',
          'reporter_phone_provided',
          'clothing_mentioned',
        ],
        reasoning: 'Specific details — LGA, landmark, time, clothing. Reporter provides phone. Credible.',
      },
    });

    const res = await request(app)
      .post('/check-authenticity')
      .send({
        text: 'My daughter Fatima (age 9) was taken from Maru Market in Zamfara this morning around 8am. She was wearing a blue school uniform with white hijab. I am her mother, please call 08031234567.',
        reporter_phone: '08031234567',
      })
      .expect(200);

    expect(res.body.verdict).toBe('legitimate');
    expect(res.body.authenticity_score).toBeGreaterThan(0.8);
    expect(res.body.green_flags.length).toBeGreaterThan(0);
    expect(res.body.red_flags).toHaveLength(0);
  });

  it('generic description no location no time → suspicious (not blocked)', async () => {
    mockComplete.mockResolvedValue({
      parsed: {
        verdict: 'suspicious',
        authenticity_score: 0.45,
        red_flags: ['no_location_details', 'no_time_reference', 'generic_description'],
        green_flags: ['reporter_phone_provided'],
        reasoning: 'No LGA, landmark, or time reference. But one green flag — flag as suspicious, don\'t block.',
      },
    });

    const res = await request(app)
      .post('/check-authenticity')
      .send({
        text: 'Please help my child is missing. He is a small boy, please share urgently.',
        reporter_phone: '08011111111',
      })
      .expect(200);

    expect(res.body.verdict).toBe('suspicious');
    expect(res.body.authenticity_score).toBeLessThan(0.6);
    // "suspicious" means flagged for ops awareness — NOT blocked
  });

  it('emotional manipulation with no facts → hold_for_review', async () => {
    mockComplete.mockResolvedValue({
      parsed: {
        verdict: 'hold_for_review',
        authenticity_score: 0.25,
        red_flags: [
          'no_location_details',
          'no_time_reference',
          'generic_description',
          'emotional_manipulation',
          'chain_forward_formatting',
        ],
        green_flags: [],
        reasoning: 'Multiple strong red flags — ALL CAPS pleading, no facts, chain-forward pattern. Ops should verify.',
      },
    });

    const res = await request(app)
      .post('/check-authenticity')
      .send({
        text: 'PLEASE SHARE URGENTLY!!! A child has been kidnapped!!! EVERYONE MUST SHARE THIS!!! SAVE A LIFE!!!',
      })
      .expect(200);

    expect(res.body.verdict).toBe('hold_for_review');
    expect(res.body.authenticity_score).toBeLessThan(0.3);
    expect(res.body.red_flags.length).toBeGreaterThanOrEqual(3);
    expect(res.body.green_flags).toHaveLength(0);
    // "hold_for_review" — ops should verify before broadcasting
  });

  it('empty LLM output → legitimate (trust by default, score 0.7)', async () => {
    mockComplete.mockResolvedValue({
      parsed: null,
      content: '',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      model: 'mock',
      provider: 'mock',
      latencyMs: 0,
    });

    const res = await request(app)
      .post('/check-authenticity')
      .send({ text: 'My brother went missing in Lagos yesterday.' })
      .expect(200);

    // Trust-by-default fallback — never block a report when the LLM fails
    expect(res.body.verdict).toBe('legitimate');
    expect(res.body.authenticity_score).toBe(0.7);
    expect(res.body.red_flags).toEqual([]);
    expect(res.body.green_flags).toEqual([]);
  });

  it('requires text field', async () => {
    await request(app)
      .post('/check-authenticity')
      .send({ reporter_phone: '080' })
      .expect(400);
  });
});
