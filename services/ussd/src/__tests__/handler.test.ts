/**
 * RAVENCRY USSD Service — Handler Tests
 *
 * Tests the USSD state machine with mocked DB and DynamoDB.
 * Verifies all 4 branches: report, sighting, alert lookup, subscribe/unsubscribe.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleUSSD, hashPhone, type USSDRequest } from '../handler';

// ── Mock DB ─────────────────────────────────────────────────────────────────

vi.mock('../db', () => ({
  createCase: vi.fn().mockResolvedValue('NR-2026-000042'),
  caseExists: vi.fn().mockResolvedValue(true),
  createSighting: vi.fn().mockResolvedValue(undefined),
  getLatestAlertByLGA: vi.fn().mockResolvedValue(null),
  upsertSubscriber: vi.fn().mockResolvedValue(undefined),
  removeSubscriber: vi.fn().mockResolvedValue(true),
}));

vi.mock('../session', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 3,
    current_count: 0,
    reset_at: new Date().toISOString(),
  }),
  incrementReportCount: vi.fn().mockResolvedValue(undefined),
}));

import * as db from '../db';
import * as session from '../session';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeReq(text: string): USSDRequest {
  return {
    sessionId: 'test-session-001',
    serviceCode: '*384*72836#',
    phoneNumber: '+2348012345678',
    text,
    networkCode: '99999',
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('USSD Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Root Menu ───────────────────────────────────────────────────────────

  describe('Root Menu', () => {
    it('shows root menu on empty text (initial dial)', async () => {
      const response = await handleUSSD(makeReq(''));
      expect(response).toMatch(/^CON/);
      expect(response).toContain('RAVENCRY');
      expect(response).toContain('1. Report missing person');
      expect(response).toContain('2. I saw a missing person');
      expect(response).toContain('3. Latest alert in my area');
      expect(response).toContain('4. Subscribe / Unsubscribe');
    });

    it('shows invalid option for unknown input', async () => {
      const response = await handleUSSD(makeReq('9'));
      expect(response).toMatch(/^CON/);
      expect(response).toContain('Invalid option');
    });
  });

  // ── Branch 1: Report Missing Person ─────────────────────────────────────

  describe('Branch 1: Report Missing Person', () => {
    it('asks for name after selecting option 1', async () => {
      const response = await handleUSSD(makeReq('1'));
      expect(response).toMatch(/^CON/);
      expect(response).toContain('name');
    });

    it('asks for age after name is entered', async () => {
      const response = await handleUSSD(makeReq('1*Amina Musa'));
      expect(response).toMatch(/^CON/);
      expect(response).toContain('age');
    });

    it('asks for LGA after age is entered', async () => {
      const response = await handleUSSD(makeReq('1*Amina Musa*8'));
      expect(response).toMatch(/^CON/);
      expect(response).toContain('last seen');
    });

    it('asks for when after LGA is entered', async () => {
      const response = await handleUSSD(makeReq('1*Amina Musa*8*Kano Central'));
      expect(response).toMatch(/^CON/);
      expect(response).toContain('When');
    });

    it('creates case with all fields and returns case ID', async () => {
      const response = await handleUSSD(
        makeReq('1*Amina Musa*8*Kano Central*today 2pm'),
      );

      expect(response).toMatch(/^END/);
      expect(response).toContain('NR-2026-000042');
      expect(response).toContain('Report received');
      expect(response).toContain('police');

      expect(db.createCase).toHaveBeenCalledWith({
        name: 'Amina Musa',
        age: 8,
        lastSeenLGA: 'Kano Central',
        lastSeenWhen: 'today 2pm',
        phoneHash: hashPhone('+2348012345678'),
      });

      expect(session.incrementReportCount).toHaveBeenCalledWith(
        hashPhone('+2348012345678'),
      );
    });

    it('handles non-numeric age gracefully (stores as null)', async () => {
      const response = await handleUSSD(
        makeReq('1*Amina Musa*unknown*Kano Central*today 2pm'),
      );

      expect(response).toMatch(/^END/);
      expect(response).toContain('NR-2026-000042');

      expect(db.createCase).toHaveBeenCalledWith(
        expect.objectContaining({ age: null }),
      );
    });

    it('blocks report when rate limited', async () => {
      vi.mocked(session.checkRateLimit).mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        current_count: 3,
        reset_at: new Date().toISOString(),
      });

      const response = await handleUSSD(makeReq('1'));
      expect(response).toMatch(/^END/);
      expect(response).toContain('maximum reports');
      expect(response).toContain('112');
    });

    it('blocks at submission if rate limit reached during flow', async () => {
      // Allow at step 1 check
      vi.mocked(session.checkRateLimit)
        .mockResolvedValueOnce({
          allowed: true,
          remaining: 1,
          current_count: 2,
          reset_at: new Date().toISOString(),
        });

      // First call succeeds (step 1)
      await handleUSSD(makeReq('1'));

      // Simulate rate limit hit by step 5
      vi.mocked(session.checkRateLimit).mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        current_count: 3,
        reset_at: new Date().toISOString(),
      });

      const response = await handleUSSD(
        makeReq('1*Test*10*Lagos*today'),
      );
      expect(response).toMatch(/^END/);
      expect(response).toContain('maximum reports');
      expect(db.createCase).not.toHaveBeenCalled();
    });
  });

  // ── Branch 2: Report Sighting ───────────────────────────────────────────

  describe('Branch 2: Report Sighting', () => {
    it('asks for case ID after selecting option 2', async () => {
      const response = await handleUSSD(makeReq('2'));
      expect(response).toMatch(/^CON/);
      expect(response).toContain('Case ID');
    });

    it('asks for location if case ID exists', async () => {
      vi.mocked(db.caseExists).mockResolvedValueOnce(true);

      const response = await handleUSSD(makeReq('2*NR-2026-000042'));
      expect(response).toMatch(/^CON/);
      expect(response).toContain('Where');
    });

    it('rejects invalid case ID', async () => {
      vi.mocked(db.caseExists).mockResolvedValueOnce(false);

      const response = await handleUSSD(makeReq('2*INVALID-ID'));
      expect(response).toMatch(/^END/);
      expect(response).toContain('not found');
    });

    it('creates sighting with valid case ID and location', async () => {
      vi.mocked(db.caseExists).mockResolvedValueOnce(true);

      const response = await handleUSSD(
        makeReq('2*NR-2026-000042*Wuse Market, Abuja'),
      );

      expect(response).toMatch(/^END/);
      expect(response).toContain('Sighting recorded');
      expect(response).toContain('Thank you');

      expect(db.createSighting).toHaveBeenCalledWith({
        caseId: 'NR-2026-000042',
        location: 'Wuse Market, Abuja',
        phoneHash: hashPhone('+2348012345678'),
      });
    });
  });

  // ── Branch 3: Latest Alert ──────────────────────────────────────────────

  describe('Branch 3: Latest Alert', () => {
    it('asks for LGA after selecting option 3', async () => {
      const response = await handleUSSD(makeReq('3'));
      expect(response).toMatch(/^CON/);
      expect(response).toContain('LGA');
    });

    it('shows "no active alerts" when none found', async () => {
      vi.mocked(db.getLatestAlertByLGA).mockResolvedValueOnce(null);

      const response = await handleUSSD(makeReq('3*Ikeja'));
      expect(response).toMatch(/^END/);
      expect(response).toContain('No active alerts');
    });

    it('displays alert details when found', async () => {
      vi.mocked(db.getLatestAlertByLGA).mockResolvedValueOnce({
        case_id: 'NR-2026-000099',
        full_name: 'Amina Musa',
        age_estimate: 8,
        last_seen_lga: 'Kano Central',
        alert_tier: 'FLASH',
        last_seen_time: '2026-06-27T14:00:00Z',
      });

      const response = await handleUSSD(makeReq('3*Kano'));
      expect(response).toMatch(/^END/);
      expect(response).toContain('FLASH');
      expect(response).toContain('Amina Musa');
      expect(response).toContain('NR-2026-000099');
    });
  });

  // ── Branch 4: Subscribe / Unsubscribe ─────────────────────────────────

  describe('Branch 4: Subscribe / Unsubscribe', () => {
    it('shows subscribe/unsubscribe menu', async () => {
      const response = await handleUSSD(makeReq('4'));
      expect(response).toMatch(/^CON/);
      expect(response).toContain('Subscribe');
      expect(response).toContain('Unsubscribe');
    });

    it('asks for LGA when subscribing', async () => {
      const response = await handleUSSD(makeReq('4*1'));
      expect(response).toMatch(/^CON/);
      expect(response).toContain('LGA');
    });

    it('subscribes to LGA alerts', async () => {
      const response = await handleUSSD(makeReq('4*1*Ikeja'));
      expect(response).toMatch(/^END/);
      expect(response).toContain('Subscribed');
      expect(response).toContain('Ikeja');

      expect(db.upsertSubscriber).toHaveBeenCalledWith(
        hashPhone('+2348012345678'),
        'Ikeja',
      );
    });

    it('unsubscribes from alerts', async () => {
      const response = await handleUSSD(makeReq('4*2'));
      expect(response).toMatch(/^END/);
      expect(response).toContain('Unsubscribed');

      expect(db.removeSubscriber).toHaveBeenCalledWith(
        hashPhone('+2348012345678'),
      );
    });
  });

  // ── Error Handling ────────────────────────────────────────────────────

  describe('Error Handling', () => {
    it('returns service error on DB failure', async () => {
      vi.mocked(db.createCase).mockRejectedValueOnce(new Error('DB down'));

      const response = await handleUSSD(
        makeReq('1*Test*10*Lagos*today'),
      );
      expect(response).toMatch(/^END/);
      expect(response).toContain('temporarily unavailable');
    });

    it('handles extra deep input gracefully', async () => {
      const response = await handleUSSD(
        makeReq('1*a*b*c*d*e*f'),
      );
      // Should return service error for unexpected depth
      expect(response).toMatch(/^END/);
    });
  });

  // ── Phone Hashing ──────────────────────────────────────────────────────

  describe('hashPhone', () => {
    it('produces consistent SHA-256 hash', () => {
      const hash1 = hashPhone('+2348012345678');
      const hash2 = hashPhone('+2348012345678');
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex = 64 chars
    });

    it('produces different hashes for different numbers', () => {
      const hash1 = hashPhone('+2348012345678');
      const hash2 = hashPhone('+2348099999999');
      expect(hash1).not.toBe(hash2);
    });
  });
});
