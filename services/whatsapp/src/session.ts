/**
 * WhatsApp Session Store (stub)
 *
 * Reserved for future stateful conversation flows.
 * Currently all messages are stateless — forwarded to n8n WF-01 for processing,
 * which handles the full triage pipeline (extract → classify → insert → reply).
 *
 * If conversational flows are needed post-hackathon:
 * - Store conversation state per phone in DynamoDB (TTL: 30 min)
 * - States: GREETING → REPORT_TYPE → COLLECTING_DETAILS → PHOTO_REQUEST → CONFIRM
 */
export {};
