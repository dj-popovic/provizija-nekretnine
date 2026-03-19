// ---------------------------------------------------------------------------
// Shared email service (Resend)
//
// Single send function used by all form handlers.
// Keeps transport concerns in one place.
// ---------------------------------------------------------------------------

import { Resend } from "resend";
import { config } from "../../config/index.js";

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

let resend: Resend | null = null;

function getClient(): Resend {
  if (!resend) {
    if (!config.resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured.");
    }
    resend = new Resend(config.resendApiKey);
  }
  return resend;
}

// ---------------------------------------------------------------------------
// Send interface
// ---------------------------------------------------------------------------

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  error?: string;
}

/**
 * Send an email via Resend.
 * Returns a result object instead of throwing, so callers can handle
 * failures cleanly in the request-response cycle.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  try {
    const client = getClient();

    const { error } = await client.emails.send({
      from: config.emailFrom,
      to: params.to,
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error";
    return { success: false, error: message };
  }
}
