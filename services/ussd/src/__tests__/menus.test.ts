/**
 * RAVENCRY USSD Service — Menu Text Tests
 *
 * Verifies menu formatting, character limits, and alert display.
 */

import { describe, it, expect } from 'vitest';
import {
  ROOT_MENU,
  REPORT_NAME_PROMPT,
  REPORT_AGE_PROMPT,
  REPORT_LGA_PROMPT,
  REPORT_WHEN_PROMPT,
  REPORT_RATE_LIMITED,
  SIGHTING_CASE_ID_PROMPT,
  SIGHTING_LOCATION_PROMPT,
  SIGHTING_CASE_NOT_FOUND,
  ALERT_LGA_PROMPT,
  ALERT_NONE_ACTIVE,
  SUBSCRIBE_MENU,
  SUBSCRIBE_LGA_PROMPT,
  UNSUBSCRIBE_SUCCESS,
  INVALID_OPTION,
  SERVICE_ERROR,
  reportSuccess,
  sightingSuccess,
  formatAlertForUSSD,
  subscribeSuccess,
} from '../menus';

// ── USSD Character Limit ────────────────────────────────────────────────────

const USSD_MAX_CHARS = 182;

function contentLength(text: string): number {
  // Remove CON/END prefix (4 chars including space)
  const prefix = text.startsWith('CON ') || text.startsWith('END ') ? 4 : 0;
  return text.length - prefix;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Menu Text', () => {
  describe('Prefix format', () => {
    it('CON menus start with CON', () => {
      expect(ROOT_MENU).toMatch(/^CON/);
      expect(REPORT_NAME_PROMPT).toMatch(/^CON/);
      expect(REPORT_AGE_PROMPT).toMatch(/^CON/);
      expect(REPORT_LGA_PROMPT).toMatch(/^CON/);
      expect(REPORT_WHEN_PROMPT).toMatch(/^CON/);
      expect(SIGHTING_CASE_ID_PROMPT).toMatch(/^CON/);
      expect(SIGHTING_LOCATION_PROMPT).toMatch(/^CON/);
      expect(ALERT_LGA_PROMPT).toMatch(/^CON/);
      expect(SUBSCRIBE_MENU).toMatch(/^CON/);
      expect(SUBSCRIBE_LGA_PROMPT).toMatch(/^CON/);
      expect(INVALID_OPTION).toMatch(/^CON/);
    });

    it('END menus start with END', () => {
      expect(REPORT_RATE_LIMITED).toMatch(/^END/);
      expect(SIGHTING_CASE_NOT_FOUND).toMatch(/^END/);
      expect(ALERT_NONE_ACTIVE).toMatch(/^END/);
      expect(UNSUBSCRIBE_SUCCESS).toMatch(/^END/);
      expect(SERVICE_ERROR).toMatch(/^END/);
    });

    it('dynamic END functions return END prefix', () => {
      expect(reportSuccess('NR-2026-000001')).toMatch(/^END/);
      expect(sightingSuccess()).toMatch(/^END/);
      expect(subscribeSuccess('Ikeja')).toMatch(/^END/);
    });
  });

  describe('Root menu', () => {
    it('contains all 4 options', () => {
      expect(ROOT_MENU).toContain('1.');
      expect(ROOT_MENU).toContain('2.');
      expect(ROOT_MENU).toContain('3.');
      expect(ROOT_MENU).toContain('4.');
    });

    it('mentions RAVENCRY', () => {
      expect(ROOT_MENU).toContain('RAVENCRY');
    });
  });

  describe('Report success', () => {
    it('includes case ID', () => {
      const msg = reportSuccess('NR-2026-000042');
      expect(msg).toContain('NR-2026-000042');
    });

    it('mentions police', () => {
      const msg = reportSuccess('NR-2026-000042');
      expect(msg).toContain('police');
    });
  });

  describe('Alert formatting', () => {
    it('formats FLASH alert correctly', () => {
      const msg = formatAlertForUSSD({
        case_id: 'NR-2026-000099',
        full_name: 'Amina Musa',
        age_estimate: 8,
        last_seen_lga: 'Kano Central',
        alert_tier: 'FLASH',
        last_seen_time: '2026-06-27T14:00:00Z',
      });

      expect(msg).toMatch(/^END/);
      expect(msg).toContain('FLASH');
      expect(msg).toContain('Amina Musa');
      expect(msg).toContain('age 8');
      expect(msg).toContain('Kano Central');
      expect(msg).toContain('NR-2026-000099');
    });

    it('formats PRIORITY alert correctly', () => {
      const msg = formatAlertForUSSD({
        case_id: 'NR-2026-000100',
        full_name: 'Ibrahim Yusuf',
        age_estimate: null,
        last_seen_lga: 'Ikeja',
        alert_tier: 'PRIORITY',
        last_seen_time: null,
      });

      expect(msg).toMatch(/^END/);
      expect(msg).toContain('ALERT');
      expect(msg).toContain('Ibrahim Yusuf');
      expect(msg).not.toContain('age');
    });

    it('truncates long alerts to fit USSD screen', () => {
      const msg = formatAlertForUSSD({
        case_id: 'NR-2026-000099',
        full_name: 'A'.repeat(150), // Very long name
        age_estimate: 25,
        last_seen_lga: 'Very Long LGA Name That Goes On Forever',
        alert_tier: 'FLASH',
        last_seen_time: null,
      });

      // Should be truncated with ...
      expect(msg.length).toBeLessThanOrEqual(USSD_MAX_CHARS + 4); // +4 for "END " prefix
    });

    it('handles missing optional fields', () => {
      const msg = formatAlertForUSSD({
        case_id: 'NR-2026-000001',
        full_name: 'Test Person',
        age_estimate: null,
        last_seen_lga: null,
        alert_tier: null,
        last_seen_time: null,
      });

      expect(msg).toMatch(/^END/);
      expect(msg).toContain('Test Person');
      expect(msg).toContain('NR-2026-000001');
    });
  });

  describe('Subscribe success', () => {
    it('includes LGA name', () => {
      const msg = subscribeSuccess('Ikeja');
      expect(msg).toContain('Ikeja');
    });

    it('mentions alerts', () => {
      const msg = subscribeSuccess('Kano Municipal');
      expect(msg).toContain('alert');
    });
  });
});
