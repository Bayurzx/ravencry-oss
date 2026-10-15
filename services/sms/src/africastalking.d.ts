/**
 * Type declarations for africastalking (no @types package available).
 * The official SDK is CommonJS with no TypeScript support.
 */
declare module 'africastalking' {
  interface ATSMSOptions {
    /** Recipient phone number(s) — comma-separated string or array */
    to: string | string[];
    /** SMS body text */
    message: string;
    /** Sender ID (alphanumeric or shortcode) */
    from?: string;
    /** Alias for from */
    senderId?: string;
    /** Queue message for delivery (true = async, false = wait for delivery report) */
    enqueue?: boolean;
  }

  interface ATSMSRecipient {
    statusCode: number;
    number: string;
    status: string;
    cost: string;
    messageId: string;
  }

  interface ATSMSResponseData {
    SMSMessageData: {
      Message: string;
      Recipients: ATSMSRecipient[];
    };
  }

  interface SMS {
    send(params: ATSMSOptions): Promise<ATSMSResponseData>;
    send(params: ATSMSOptions[]): Promise<ATSMSResponseData[]>;
  }

  interface ATOptions {
    apiKey: string;
    username: string;
  }

  interface AfricasTalking {
    SMS: SMS;
  }

  function AfricasTalking(options: ATOptions): AfricasTalking;

  export default AfricasTalking;
}
