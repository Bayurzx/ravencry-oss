/**
 * T-031 · QW-02 Severity Classification Tests
 *
 * CRITICAL FLASH RULES (must NEVER miss):
 * - Child (≤17) → FLASH
 * - Hotspot state (Zamfara, Kaduna, Katsina, Borno, etc.) → FLASH
 * - Multiple victims → FLASH
 * - Weapons mentioned → FLASH
 * - Adult missing, non-hotspot → ROUTINE
 * - Adult missing, high-risk route → PRIORITY minimum
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

describe('POST /classify — FLASH rules', () => {
  it('child abduction in Zamfara → FLASH + immediate_broadcast', async () => {
    mockComplete.mockResolvedValue({
      parsed: {
        tier: 'FLASH',
        reasoning: 'Child (age 9) abducted in Zamfara — hotspot state, child victim, active abduction.',
        is_child: true,
        is_hotspot: true,
        escalating_factors: ['child_victim', 'hotspot_state', 'active_abduction'],
        de_escalating_factors: [],
        recommended_action: 'immediate_broadcast',
        operator_note: null,
        confidence: 0.96,
      },
    });

    const res = await request(app)
      .post('/classify')
      .send({
        person: { person_name: 'Fatima', age_estimate: 9, gender: 'female', circumstance: 'abduction' },
        location: { last_seen_state: 'Zamfara', last_seen_lga: 'Maru', last_seen_location: 'Maru Market' },
      })
      .expect(200);

    expect(res.body.tier).toBe('FLASH');
    expect(res.body.is_child).toBe(true);
    expect(res.body.is_hotspot).toBe(true);
    expect(res.body.recommended_action).toBe('immediate_broadcast');
    expect(res.body.escalating_factors).toContain('child_victim');
    expect(res.body.confidence).toBeGreaterThan(0.9);
  });

  it('adult missing in Lagos → ROUTINE + log_only', async () => {
    mockComplete.mockResolvedValue({
      parsed: {
        tier: 'ROUTINE',
        reasoning: 'Adult voluntary missing in Lagos — non-hotspot, no violence indicators.',
        is_child: false,
        is_hotspot: false,
        escalating_factors: [],
        de_escalating_factors: ['adult_victim', 'non_hotspot', 'no_violence'],
        recommended_action: 'log_only',
        operator_note: 'Low priority. Log for monitoring.',
        confidence: 0.88,
      },
    });

    const res = await request(app)
      .post('/classify')
      .send({
        person: { person_name: 'Musa', age_estimate: 35, gender: 'male', circumstance: 'missing' },
        location: { last_seen_state: 'Lagos', last_seen_lga: 'Ikeja', last_seen_location: 'Computer Village' },
      })
      .expect(200);

    expect(res.body.tier).toBe('ROUTINE');
    expect(res.body.is_child).toBe(false);
    expect(res.body.is_hotspot).toBe(false);
    expect(res.body.recommended_action).toBe('log_only');
    expect(res.body.de_escalating_factors.length).toBeGreaterThan(0);
  });

  it('multiple victims in Kaduna → FLASH', async () => {
    mockComplete.mockResolvedValue({
      parsed: {
        tier: 'FLASH',
        reasoning: 'Multiple victims (3) in Kaduna hotspot. School bus incident.',
        is_child: true,
        is_hotspot: true,
        escalating_factors: ['multiple_victims', 'child_victim', 'hotspot_state', 'school_bus'],
        de_escalating_factors: [],
        recommended_action: 'immediate_broadcast',
        operator_note: 'Mass abduction — escalate to NAPTIP immediately.',
        confidence: 0.97,
      },
    });

    const res = await request(app)
      .post('/classify')
      .send({
        person: { num_victims: 3, age_estimate: 12, circumstance: 'abduction' },
        location: { last_seen_state: 'Kaduna', last_seen_location: 'Birnin Gwari' },
      })
      .expect(200);

    expect(res.body.tier).toBe('FLASH');
    expect(res.body.escalating_factors).toContain('multiple_victims');
    expect(res.body.escalating_factors).toContain('school_bus');
  });

  it('adult missing on Abuja-Kaduna road → PRIORITY minimum', async () => {
    mockComplete.mockResolvedValue({
      parsed: {
        tier: 'PRIORITY',
        reasoning: 'Adult missing on high-risk Abuja-Kaduna expressway. Escalates from ROUTINE due to route.',
        is_child: false,
        is_hotspot: false,
        escalating_factors: ['high_risk_route'],
        de_escalating_factors: ['adult_victim'],
        recommended_action: 'operator_review',
        operator_note: 'High-risk route. Escalate to active search if not resolved in 6 hours.',
        confidence: 0.82,
      },
    });

    const res = await request(app)
      .post('/classify')
      .send({
        person: { person_name: 'Bello', age_estimate: 42, gender: 'male', circumstance: 'missing' },
        location: { last_seen_location: 'Abuja-Kaduna expressway, near Katari', last_seen_state: 'Niger' },
      })
      .expect(200);

    expect(res.body.tier).toBe('PRIORITY');
    expect(res.body.is_child).toBe(false);
    expect(res.body.escalating_factors).toContain('high_risk_route');
  });

  it('weapons mentioned → FLASH regardless of location', async () => {
    mockComplete.mockResolvedValue({
      parsed: {
        tier: 'FLASH',
        reasoning: 'Witnessed kidnapping with firearms. Weapons present → FLASH regardless of non-hotspot state.',
        is_child: false,
        is_hotspot: false,
        escalating_factors: ['weapons_present', 'witnessed_kidnapping'],
        de_escalating_factors: ['non_hotspot'],
        recommended_action: 'immediate_broadcast',
        operator_note: 'Armed abduction — broadcast to all channels.',
        confidence: 0.94,
      },
    });

    const res = await request(app)
      .post('/classify')
      .send({
        person: { weapons_mentioned: ['AK-47'], circumstance: 'witnessed_kidnapping', age_estimate: 25 },
        location: { last_seen_state: 'Ogun', last_seen_location: 'Abeokuta' },
      })
      .expect(200);

    expect(res.body.tier).toBe('FLASH');
    expect(res.body.escalating_factors).toContain('weapons_present');
  });
});

describe('POST /classify — validation & defaults', () => {
  it('returns safe defaults when LLM produces empty output', async () => {
    mockComplete.mockResolvedValue({
      parsed: null,
      content: '',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      model: 'mock',
      provider: 'mock',
      latencyMs: 0,
    });

    const res = await request(app)
      .post('/classify')
      .send({
        person: { person_name: 'Test' },
        location: { last_seen_state: 'FCT' },
      })
      .expect(200);

    expect(res.body.tier).toBe('ROUTINE');
    expect(res.body.recommended_action).toBe('operator_review');
    expect(res.body.confidence).toBe(0.5);
    expect(res.body.escalating_factors).toEqual([]);
  });

  it('requires person and location fields', async () => {
    await request(app)
      .post('/classify')
      .send({ person: {} })
      .expect(400);

    await request(app)
      .post('/classify')
      .send({ location: {} })
      .expect(400);
  });
});
