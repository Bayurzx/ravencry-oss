/**
 * RAVENCRY Telegram Bot — Command Handler
 *
 * Receives Telegram Update objects (webhook mode), routes to command handlers.
 *
 * Commands:
 *   /start    — Welcome message + inline menu
 *   /report   — Guide to report a missing person (WhatsApp / USSD / PWA)
 *   /sighting — Submit a sighting tip for an existing case
 *   /status   — Check status of a reported case
 *   /help     — Show available commands
 *
 * Also handles plain text messages as potential case lookups.
 */

import { escapeMarkdownV2 } from './templates';

// ---- Config ---------------------------------------------------------------

function getBotToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN || '';
}

function getApiBase(): string {
  return `https://api.telegram.org/bot${getBotToken()}`;
}

function getApiGatewayUrl(): string {
  return process.env.API_GATEWAY_URL || 'http://api:3003';
}

// ---- Telegram Types -------------------------------------------------------

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  text?: string;
  entities?: TelegramEntity[];
}

interface TelegramEntity {
  type: 'bot_command' | 'mention' | 'hashtag' | 'url';
  offset: number;
  length: number;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: {
    id: string;
    from: TelegramUser;
    message?: TelegramMessage;
    data?: string;
  };
}

// ---- Helpers --------------------------------------------------------------

async function sendMessage(
  chatId: number,
  text: string,
  options?: {
    parse_mode?: 'MarkdownV2' | 'HTML';
    reply_markup?: Record<string, unknown>;
  },
): Promise<boolean> {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    ...options,
  };

  try {
    const res = await fetch(`${getApiBase()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as { ok: boolean; description?: string };

    // If MarkdownV2 parse error, retry without formatting
    if (!json.ok && json.description?.includes('parse') && options?.parse_mode) {
      const { parse_mode: _, ...rest } = options;
      return sendMessage(chatId, text, rest);
    }

    if (!json.ok) {
      console.error(`[telegram-bot] sendMessage failed: ${json.description}`);
    }

    return json.ok;
  } catch (err: unknown) {
    console.error(
      `[telegram-bot] sendMessage error: ${err instanceof Error ? err.message : String(err)}`,
    );
    return false;
  }
}

// ---- Command Handlers -----------------------------------------------------

async function handleStart(chatId: number, user: TelegramUser): Promise<void> {
  const e = escapeMarkdownV2;
  const name = e(user.first_name);

  const text = [
    `🦅 *Welcome to RAVENCRY, ${name}\\!*`,
    '',
    'RAVENCRY is Nigeria\'s rapid\\-response alert system for missing persons and child abductions\\. We connect citizens, law enforcement, and communities to find missing people *fast*\\.',
    '',
    '*What you can do:*',
    '',
    '📝 */report* \\- Report a missing person',
    '👁️ */sighting* \\- Submit a sighting tip',
    '📊 */status* \\- Check a case status',
    'ℹ️ */help* \\- See all commands',
    '',
    '🔴 *FLASH Alerts* are broadcast to this channel within seconds of an abduction report\\. Turn on notifications to never miss one\\.',
    '',
    `📞 *USSD:* Dial \\*384*72836# on any phone \\(no internet needed\\)`,
    `📱 *WhatsApp:* Message our bot for faster reporting`,
    '',
    '_Together, we can keep Nigerian communities safe\\._',
  ].join('\n');

  await sendMessage(chatId, text, { parse_mode: 'MarkdownV2' });
}

async function handleReport(chatId: number): Promise<void> {
  const e = escapeMarkdownV2;

  const text = [
    '📝 *Report a Missing Person*',
    '',
    'To submit a report, choose one of these methods:',
    '',
    '1️⃣ *WhatsApp \\(Fastest\\)*',
    `   Message our WhatsApp bot with:`,
    `   \\- Name of the missing person`,
    `   \\- Age`,
    `   \\- Last seen location`,
    `   \\- When they were last seen`,
    `   \\- Photo \\(if available\\)`,
    '',
    '2️⃣ *USSD \\(No internet needed\\)*',
    `   Dial \\*384*72836# on any phone`,
    `   Follow the prompts to submit a report`,
    '',
    '3️⃣ *Web App*',
    `   Visit our website to submit a report online`,
    '',
    '4️⃣ *Telegram \\(Basic\\)*',
    `   Send the details as a text message and we\`ll create a case\\.`,
    '',
    '⚠️ *Important:* Please provide as much detail as possible\\. Every second counts in the first hours\\.',
  ].join('\n');

  await sendMessage(chatId, text, { parse_mode: 'MarkdownV2' });
}

async function handleSighting(chatId: number): Promise<void> {
  const e = escapeMarkdownV2;

  const text = [
    '👁️ *Submit a Sighting*',
    '',
    'If you have seen a person from an active alert:',
    '',
    '1\\. Send the *Case ID* \\(e\\.g\\. `NR\\-2026\\-000001`\\)',
    '2\\. Describe *where* and *when* you saw them',
    '3\\. Include a photo if possible',
    '',
    'Example:',
    `\`NR\\-2026\\-000001 seen at Wuse Market, Abuja, around 2pm today\\. Wearing a blue shirt\\.\``,
    '',
    'You can also submit sightings via:',
    `📞 USSD: \\*384*72836#`,
    `📱 WhatsApp`,
    `🌐 Web app`,
    '',
    '_Your tip could save a life\\. Every sighting matters\\._',
  ].join('\n');

  await sendMessage(chatId, text, { parse_mode: 'MarkdownV2' });
}

async function handleStatus(
  chatId: number,
  args: string,
): Promise<void> {
  const e = escapeMarkdownV2;

  // If no case ID provided, show instructions
  if (!args || !args.trim()) {
    const text = [
      '📊 *Check Case Status*',
      '',
      'Send the Case ID to check status:',
      '',
      '`/status NR\\-2026\\-000001`',
      '',
      'You can find the Case ID in the alert message or confirmation you received when submitting a report\\.',
    ].join('\n');

    await sendMessage(chatId, text, { parse_mode: 'MarkdownV2' });
    return;
  }

  const caseId = args.trim();

  // Try to fetch case from API gateway
  try {
    const res = await fetch(`${getApiGatewayUrl()}/api/cases/${encodeURIComponent(caseId)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const c = (await res.json()) as {
        case_id: string;
        person_name: string;
        status: string;
        alert_tier?: string;
        last_seen_location?: string;
        last_seen_time?: string;
        sightings_count?: number;
      };

      const statusEmoji: Record<string, string> = {
        received: '📥',
        pending_triage: '⏳',
        pending_review: '🔍',
        approved: '✅',
        broadcast: '📡',
        broadcast_complete: '✅',
        suppressed: '🚫',
        resolved: '🏁',
      };

      const tierEmoji: Record<string, string> = {
        FLASH: '🔴',
        PRIORITY: '🟠',
        ROUTINE: '🟢',
      };

      const lines = [
        '📊 *Case Status*',
        '',
        `*Case ID:* \`${e(c.case_id)}\``,
        `*Name:* ${e(c.person_name)}`,
        `*Status:* ${statusEmoji[c.status] || '❓'} ${e(c.status)}`,
        c.alert_tier
          ? `*Alert Tier:* ${tierEmoji[c.alert_tier] || ''} ${e(c.alert_tier)}`
          : null,
        c.last_seen_location
          ? `*Last Seen:* ${e(c.last_seen_location)}`
          : null,
        c.last_seen_time ? `*When:* ${e(c.last_seen_time)}` : null,
        c.sightings_count !== undefined
          ? `*Sightings:* ${c.sightings_count}`
          : null,
      ];

      await sendMessage(chatId, lines.filter(Boolean).join('\n'), {
        parse_mode: 'MarkdownV2',
      });
    } else if (res.status === 404) {
      await sendMessage(
        chatId,
        `❌ Case \`${e(caseId)}\` not found\\. Please check the Case ID and try again\\.`,
        { parse_mode: 'MarkdownV2' },
      );
    } else {
      await sendMessage(
        chatId,
        `⚠️ Could not fetch case status right now\\. Please try again in a moment\\.`,
        { parse_mode: 'MarkdownV2' },
      );
    }
  } catch {
    await sendMessage(
      chatId,
      `⚠️ Could not connect to check case status\\. Please try again later\\.`,
      { parse_mode: 'MarkdownV2' },
    );
  }
}

async function handleHelp(chatId: number): Promise<void> {
  const e = escapeMarkdownV2;

  const text = [
    'ℹ️ *RAVENCRY Bot Commands*',
    '',
    '/start \\- Welcome message',
    '/report \\- Report a missing person',
    '/sighting \\- Submit a sighting tip',
    '/status \\<case\\_id\\> \\- Check case status',
    '/help \\- Show this help',
    '',
    '📞 *USSD:* \\*384*72836#',
    '📱 *WhatsApp:* Message our bot',
    '🌐 *Web:* Visit our website',
  ].join('\n');

  await sendMessage(chatId, text, { parse_mode: 'MarkdownV2' });
}

// ---- Update Router --------------------------------------------------------

/**
 * Process a single Telegram update.
 * Extracts the command from the message text and routes to the handler.
 */
export async function processUpdate(update: TelegramUpdate): Promise<void> {
  const msg = update.message;
  if (!msg || !msg.text || !msg.from) {
    // Ignore non-text messages (photos, audio, etc.) — could handle later
    return;
  }

  const { chat, text, from, entities } = msg;

  // Only respond to private chats (not groups/channels, except for commands)
  // For now, accept all. Can add group chat logic later.

  // Check for bot_command entities
  const commandEntity = entities?.find((e) => e.type === 'bot_command');
  if (commandEntity && commandEntity.offset === 0) {
    // Extract command and arguments
    const commandEnd = commandEntity.offset + commandEntity.length;
    const command = text.substring(0, commandEnd).split('@')[0]; // Remove @botname if present
    const args = text.substring(commandEnd).trim();

    switch (command) {
      case '/start':
        await handleStart(chat.id, from);
        break;
      case '/report':
        await handleReport(chat.id);
        break;
      case '/sighting':
        await handleSighting(chat.id);
        break;
      case '/status':
        await handleStatus(chat.id, args);
        break;
      case '/help':
        await handleHelp(chat.id);
        break;
      default:
        await sendMessage(
          chat.id,
          `Unknown command: ${command}. Send /help to see available commands.`,
        );
    }
    return;
  }

  // Plain text message — treat as potential case ID lookup
  // (if it matches case ID pattern NR-YYYY-NNNNNN)
  const caseIdMatch = text.trim().match(/^NR-\d{4}-\d{6}$/);
  if (caseIdMatch) {
    await handleStatus(chat.id, text.trim());
    return;
  }

  // Generic text — gently redirect to commands
  await sendMessage(
    chat.id,
    [
      'I didn\'t understand that. You can:',
      '',
      '📝 /report — Report a missing person',
      '👁️ /sighting — Submit a sighting',
      '📊 /status <case_id> — Check case status',
      'ℹ️ /help — See all commands',
    ].join('\n'),
  );
}
