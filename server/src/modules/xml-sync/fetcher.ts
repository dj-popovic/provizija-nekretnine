import { config } from "../../config/index.js";
import { logger } from "../shared/logger.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export class XmlFetchError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "XmlFetchError";
  }
}

// ---------------------------------------------------------------------------
// Fetch service
// ---------------------------------------------------------------------------

const FETCH_TIMEOUT_MS = 30_000;

/**
 * Fetches raw XML from the configured feed URL.
 * Returns raw XML string on success.
 * Throws XmlFetchError on network failure, timeout, or non-OK HTTP response.
 */
export async function fetchXmlFeed(): Promise<string> {
  const url = config.xmlFeedUrl;

  logger.info({ url }, "xml-sync: fetching XML feed");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (err) {
    const isTimeout =
      err instanceof Error && err.name === "AbortError";

    const message = isTimeout
      ? `xml-sync: fetch timed out after ${FETCH_TIMEOUT_MS}ms`
      : "xml-sync: network error during XML fetch";

    logger.error({ url, err }, message);
    throw new XmlFetchError(message, err);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const message = `xml-sync: XML feed responded with HTTP ${response.status}`;
    logger.error({ url, status: response.status }, message);
    throw new XmlFetchError(message);
  }

  const xml = await response.text();

  logger.info(
    { url, byteLength: xml.length },
    "xml-sync: XML feed fetched successfully",
  );

  return xml;
}
