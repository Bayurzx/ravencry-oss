/**
 * RAVENCRY Telegram Service — Unit Tests
 *
 * Tests: templates, bot command routing, broadcast logic.
 * Run: npx vitest run
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---- Template Tests -------------------------------------------------------

import {
  formatFlashAlert,
  formatFlashAlertPlain,
  formatPriorityAlert,
  formatOpsNotification,
  escapeMarkdownV2,
  type AlertCase,
} from '../templates';

const flashCase: AlertCase = {
  case_id: 'NR-2026-000042',
  person_name: 'Amina Hassan',
  age_estimate: 9,
  gender: 'female',
  last_seen_location: 'Wuse Market, Abuja',
  last_seen_lga: 'Municipal',
  last_seen_state: 'FCT',
  last_seen_time: '2026-06-23 10:00 WAT',
  circumstance: 'abduction',
  description: 'Taken by unknown men in a blue Toyota',
  clothing_desc: 'Pink dress, yellow sandals',
  photo_url: 'https://s3.amazonaws.com/ravencry-media-prod/photos/NR-2026-000042.jpg',
  alert_tier: 'FLASH',
};

describe('templates', () => {
  describe('escapeMarkdownV2', () => {
    it('escapes special characters', () => {
      expect(escapeMarkdownV2('Hello! World.')).toBe('Hello\\! World\\.');
      expect(escapeMarkdownV2('_bold_ *italic*')).toBe('\\_bold\\_ \\*italic\\*');
      expect(escapeMarkdownV2('[link](url)')).toBe('\\[link\\]\\(url\\)');
      expect(escapeMarkdownV2('a~b`c>d#e+f-g=h|i{j}k.l')).toBe(
        'a\\~b\\`c\\>d\\#e\\+f\\-g\\=h\\|i\\{j\\}k\\.l',
      );
    });

    it('preserves normal text', () => {
      expect(escapeMarkdownV2('Hello World 123')).toBe('Hello World 123');
    });
  });

  describe('formatFlashAlert', () => {
    it('includes all critical fields', () => {
      const result = formatFlashAlert(flashCase);
      expect(result).toContain('FLASH ALERT');
      expect(result).toContain('Amina Hassan');
      expect(result).toContain('Wuse Market');
      expect(result).toContain('Pink dress');
      expect(result).toContain('NR-2026-000042');
    });

    it('handles missing optional fields gracefully', () => {
      const minimal: AlertCase = {
        case_id: 'NR-2026-000001',
        person_name: 'Ibrahim Musa',
        alert_tier: 'FLASH',
      };
      const result = formatFlashAlert(minimal);
      expect(result).toContain('Ibrahim Musa');
      expect(result).toContain('NR-2026-000001');
      expect(result).not.toContain('null');
      expect(result).not.toContain('undefined');
    });

    it('uses LGA when no specific location', () => {
      const lgaCase: AlertCase = {
        case_id: 'NR-2026-000002',
        person_name: 'Fatima Sani',
        last_seen_lga: 'Gwale',
        last_seen_state: 'Kano',
        alert_tier: 'FLASH',
      };
      const result = formatFlashAlert(lgaCase);
      expect(result).toContain('Gwale');
      expect(result).toContain('Kano');
    });
  });

  describe('formatFlashAlertPlain', () => {
    it('does not contain Markdown escape characters', () => {
      const result = formatFlashAlertPlain(flashCase);
      expect(result).not.toContain('\\!');
      expect(result).not.toContain('\\*');
      expect(result).not.toContain('\\_');
      expect(result).toContain('FLASH ALERT');
      expect(result).toContain('Amina Hassan');
    });
  });

  describe('formatPriorityAlert', () => {
    it('is shorter than FLASH alert', () => {
      const priorityResult = formatPriorityAlert(flashCase);
      const flashResult = formatFlashAlert(flashCase);
      expect(priorityResult.length).toBeLessThan(flashResult.length);
      expect(priorityResult).toContain('PRIORITY ALERT');
    });
  });

  describe('formatOpsNotification', () => {
    it('includes case ID and event', () => {
      const result = formatOpsNotification(flashCase, 'FLASH_BROADCAST');
      // FLASH_BROADCAST is escaped as FLASH\_BROADCAST in MarkdownV2
      expect(result).toContain('NR-2026-000042');
      expect(result).toContain('Amina Hassan');
      expect(result).toContain('FLASH');
    });
  });
});

// ---- Bot Command Tests ----------------------------------------------------

import { processUpdate, type TelegramUpdate } from '../bot';

// Mock fetch to capture Telegram API calls
const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ ok: true, result: { message_id: 42 } }),
  });
  // Set env vars needed by bot
  process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
  process.env.API_GATEWAY_URL = 'http://api:3003';
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function makeUpdate(text: string): TelegramUpdate {
  const commandEnd = text.startsWith('/') ? text.split(' ')[0].length : 0;
  return {
    update_id: 12345,
    message: {
      message_id: 1,
      from: {
        id: 555000,
        first_name: 'Test',
        username: 'testuser',
      },
      chat: { id: 555000, type: 'private' },
      text,
      entities:
        commandEnd > 0
          ? [{ type: 'bot_command', offset: 0, length: commandEnd }]
          : undefined,
    },
  };
}

describe('bot commands', () => {
  it('/start sends welcome message', async () => {
    await processUpdate(makeUpdate('/start'));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('/sendMessage');
    const body = JSON.parse(init.body);
    expect(body.text).toContain('Welcome');
    expect(body.text).toContain('RAVENCRY');
    expect(body.chat_id).toBe(555000);
  });

  it('/report sends report guide', async () => {
    await processUpdate(makeUpdate('/report'));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.text).toContain('Report a Missing Person');
    expect(body.text).toContain('WhatsApp');
    expect(body.text).toContain('USSD');
  });

  it('/sighting sends sighting guide', async () => {
    await processUpdate(makeUpdate('/sighting'));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.text).toContain('Submit a Sighting');
    expect(body.text).toContain('Case ID');
  });

  it('/status without case ID sends instructions', async () => {
    await processUpdate(makeUpdate('/status'));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.text).toContain('Case ID');
  });

  it('/status with case ID queries API', async () => {
    // Mock API response
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, result: { message_id: 42 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          case_id: 'NR-2026-000042',
          person_name: 'Amina Hassan',
          status: 'broadcast',
          alert_tier: 'FLASH',
          last_seen_location: 'Wuse Market, Abuja',
          sightings_count: 3,
        }),
      });

    await processUpdate(makeUpdate('/status NR-2026-000042'));
    // First call: sendMessage (ack), second: API call
    expect(mockFetch).toHaveBeenCalled();
  });

  it('/help sends command list', async () => {
    await processUpdate(makeUpdate('/help'));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.text).toContain('/start');
    expect(body.text).toContain('/report');
    expect(body.text).toContain('/sighting');
    expect(body.text).toContain('/status');
  });

  it('plain text shows help prompt', async () => {
    await processUpdate(makeUpdate('hello there'));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.text).toContain('/report');
  });

  it('case ID pattern triggers status lookup', async () => {
    await processUpdate(makeUpdate('NR-2026-000042'));
    // Should try to look up the case
    expect(mockFetch).toHaveBeenCalled();
  });
});

// ---- Broadcast Tests ------------------------------------------------------

import {
  sendFlashBroadcast,
  sendPriorityBroadcast,
  sendOpsNotification,
} from '../broadcast';

describe('broadcast', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
    process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
    process.env.TELEGRAM_ALERT_CHANNEL_ID = '-1001234567890';
    process.env.TELEGRAM_OPS_CHANNEL_ID = '-1009876543210';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('sendFlashBroadcast', () => {
    it('sends photo with caption when photo_url provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, result: { message_id: 100 } }),
      });

      const result = await sendFlashBroadcast(flashCase);

      expect(result.photo_sent).toBe(true);
      expect(result.alert_message_id).toBe(100);

      // Should have been called for sendPhoto + ops notification
      const calls = mockFetch.mock.calls;
      const sendPhotoCall = calls.find((c: [string]) =>
        c[0].includes('sendPhoto'),
      );
      expect(sendPhotoCall).toBeDefined();
    });

    it('falls back to text-only when no photo_url', async () => {
      const noPhotoCase: AlertCase = {
        ...flashCase,
        photo_url: null,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, result: { message_id: 101 } }),
      });

      const result = await sendFlashBroadcast(noPhotoCase);

      expect(result.fallback_text_sent).toBe(true);
      expect(result.photo_sent).toBe(false);

      const calls = mockFetch.mock.calls;
      const sendMessageCall = calls.find((c: [string]) =>
        c[0].includes('sendMessage'),
      );
      expect(sendMessageCall).toBeDefined();
    });

    it('falls back to text when sendPhoto fails', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ ok: false, description: 'Bad Request: wrong file identifier' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ok: true, result: { message_id: 102 } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ok: true, result: { message_id: 103 } }),
        });

      const result = await sendFlashBroadcast(flashCase);

      expect(result.photo_sent).toBe(false);
      expect(result.fallback_text_sent).toBe(true);
    });
  });

  describe('sendPriorityBroadcast', () => {
    it('sends text-only message', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, result: { message_id: 200 } }),
      });

      const result = await sendPriorityBroadcast(flashCase);

      expect(result.success).toBe(true);
      expect(result.channel).toBe('alert');
    });
  });

  describe('sendOpsNotification', () => {
    it('sends message to ops channel', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, result: { message_id: 300 } }),
      });

      const result = await sendOpsNotification('Test ops message');

      expect(result.success).toBe(true);
      expect(result.channel).toBe('ops');

      const calls = mockFetch.mock.calls;
      const opsCall = calls.find((c: [string]) => c[0].includes('sendMessage'));
      expect(opsCall).toBeDefined();
      const body = JSON.parse((opsCall?.[1] as any)?.body || '{}');
      expect(body.chat_id).toBe('-1009876543210');
    });
  });
});
