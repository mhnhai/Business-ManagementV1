import { GoogleGenAI } from '@google/genai';

import EnvVars from '@src/common/constants/env';
import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import { RouteError } from '@src/common/utils/route-errors';

let client: GoogleGenAI | null = null;

export function assertGeminiConfigured(): void {
  if (!EnvVars.GeminiApiKey.trim()) {
    throw new RouteError(
      HttpStatusCodes.SERVICE_UNAVAILABLE,
      'GEMINI_API_KEY is not configured on the server.',
    );
  }
}

export function getGeminiClient(): GoogleGenAI {
  assertGeminiConfigured();
  if (!client) {
    client = new GoogleGenAI({ apiKey: EnvVars.GeminiApiKey });
  }
  return client;
}

export function getGeminiModel(): string {
  return EnvVars.GeminiModel;
}
