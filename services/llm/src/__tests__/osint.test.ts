/**
 * T-032 · QW-03 OSINT article classification tests
 *
 * Validates the /classify-osint endpoint:
 * - Punch kidnapping headline → actionable, create_draft_case
 * - Sports article → IGNORE, non-actionable
 * - Ambiguous security incident → PRIORITY (flags for ops)
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

describe('POST /classify-osint', () => {
  it('kidnapping headline from Punch → actionable, create_draft_case', async () => {
    mockComplete.mockResolvedValue({
      parsed: {
        actionable: true,
        tier: 'FLASH',
        create_draft_case: true,
        reasoning: 'Child abduction in Zamfara hotspot — immediate FLASH required.',
      },
    });

    const res = await request(app)
      .post('/classify-osint')
      .send({
        headline: 'Bandits kidnap 3 schoolchildren in Zamfara village raid',
        snippet: 'Armed bandits abducted three children returning from school in Maru LGA, Zamfara State.',
        source: 'Punch News',
      })
      .expect(200);

    expect(res.body.actionable).toBe(true);
    expect(res.body.tier).toBe('FLASH');
    expect(res.body.create_draft_case).toBe(true);
  });

  it('sports article → IGNORE, not actionable', async () => {
    mockComplete.mockResolvedValue({
      parsed: {
        actionable: false,
        tier: 'IGNORE',
        create_draft_case: false,
        reasoning: 'Sports article — no security or kidnapping relevance.',
      },
    });

    const res = await request(app)
      .post('/classify-osint')
      .send({
        headline: 'Super Eagles qualify for AFCON 2027',
        snippet: 'The Nigerian national football team secured a spot in the upcoming Africa Cup of Nations.',
        source: 'Vanguard',
      })
      .expect(200);

    expect(res.body.actionable).toBe(false);
    expect(res.body.tier).toBe('IGNORE');
    expect(res.body.create_draft_case).toBe(false);
  });

  it('ambiguous security incident → PRIORITY, not actionable for auto-case', async () => {
    mockComplete.mockResolvedValue({
      parsed: {
        actionable: false,
        tier: 'PRIORITY',
        create_draft_case: false,
        reasoning: 'Security incident in hotspot state but no kidnapping specifics — flag for ops review.',
      },
    });

    const res = await request(app)
      .post('/classify-osint')
      .send({
        headline: 'Gunmen attack village in Kaduna, residents flee',
        snippet: 'Unknown gunmen attacked a village in southern Kaduna late Tuesday. No details on casualties.',
        source: 'Daily Trust',
      })
      .expect(200);

    expect(res.body.tier).toBe('PRIORITY');
    expect(res.body.create_draft_case).toBe(false);
    // PRIORITY even without actionable=true — still useful for ops awareness
  });

  it('returns safe defaults on empty LLM output', async () => {
    mockComplete.mockResolvedValue({
      parsed: null,
      content: '',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      model: 'mock',
      provider: 'mock',
      latencyMs: 0,
    });

    const res = await request(app)
      .post('/classify-osint')
      .send({ headline: '...', snippet: '...', source: 'test' })
      .expect(200);

    expect(res.body.actionable).toBe(false);
    expect(res.body.tier).toBe('IGNORE');
    expect(res.body.create_draft_case).toBe(false);
  });
});
