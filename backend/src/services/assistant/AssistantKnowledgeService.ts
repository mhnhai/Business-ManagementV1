import fs from 'node:fs/promises';
import path from 'node:path';

import EnvVars from '@src/common/constants/env';
import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import { RouteError } from '@src/common/utils/route-errors';

import { assertGeminiConfigured, getGeminiClient } from './geminiClient';

const KNOWLEDGE_DIR = path.resolve(process.cwd(), 'docs', 'ai-knowledge');
const STORE_FILE = path.resolve(
  process.cwd(),
  'config',
  '.gemini-file-search-store',
);

async function readPersistedStoreName(): Promise<string> {
  if (EnvVars.GeminiFileSearchStore.trim()) {
    return EnvVars.GeminiFileSearchStore.trim();
  }
  try {
    const raw = await fs.readFile(STORE_FILE, 'utf8');
    return raw.trim();
  } catch {
    return '';
  }
}

async function persistStoreName(name: string): Promise<void> {
  await fs.mkdir(path.dirname(STORE_FILE), { recursive: true });
  await fs.writeFile(STORE_FILE, name, 'utf8');
}

export async function getFileSearchStoreName(): Promise<string | null> {
  const name = await readPersistedStoreName();
  return name || null;
}

/** Local keyword retrieval fallback when File Search store is not configured. */
export async function retrieveLocalKnowledge(
  query: string,
  maxChunks = 3,
): Promise<{ title: string; excerpt: string }[]> {
  let files: string[];
  try {
    files = (await fs.readdir(KNOWLEDGE_DIR)).filter((f) =>
      f.toLowerCase().endsWith('.md'),
    );
  } catch {
    return [];
  }

  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);

  const scored: { title: string; excerpt: string; score: number }[] = [];

  for (const file of files) {
    const full = path.join(KNOWLEDGE_DIR, file);
    const text = await fs.readFile(full, 'utf8');
    const lower = text.toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (lower.includes(t)) score += 1;
    }
    if (score === 0 && terms.length === 0) score = 1;
    if (score > 0) {
      scored.push({
        title: file,
        excerpt: text.slice(0, 1800),
        score,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxChunks).map(({ title, excerpt }) => ({
    title,
    excerpt,
  }));
}

export async function syncKnowledgeToFileSearch(): Promise<{
  storeName: string;
  uploaded: string[];
}> {
  assertGeminiConfigured();
  const ai = getGeminiClient();

  let storeName = await readPersistedStoreName();
  if (!storeName) {
    const store = await ai.fileSearchStores.create({
      config: {
        displayName: 'business-management-ai-knowledge',
      },
    });
    if (!store.name) {
      throw new RouteError(
        HttpStatusCodes.BAD_GATEWAY,
        'Failed to create Gemini File Search store',
      );
    }
    storeName = store.name;
    await persistStoreName(storeName);
  }

  let files: string[];
  try {
    files = (await fs.readdir(KNOWLEDGE_DIR)).filter((f) =>
      f.toLowerCase().endsWith('.md'),
    );
  } catch {
    throw new RouteError(
      HttpStatusCodes.NOT_FOUND,
      `Knowledge directory not found: ${KNOWLEDGE_DIR}`,
    );
  }

  if (files.length === 0) {
    throw new RouteError(
      HttpStatusCodes.BAD_REQUEST,
      'No markdown files in ai-knowledge folder',
    );
  }

  const uploaded: string[] = [];
  for (const file of files) {
    const full = path.join(KNOWLEDGE_DIR, file);
    let operation = await ai.fileSearchStores.uploadToFileSearchStore({
      file: full,
      fileSearchStoreName: storeName,
      config: {
        displayName: file,
        mimeType: 'text/markdown',
      },
    });

    let attempts = 0;
    while (!operation.done && attempts < 60) {
      await new Promise((r) => setTimeout(r, 2000));
      operation = await ai.operations.get({ operation });
      attempts += 1;
    }
    uploaded.push(file);
  }

  return { storeName, uploaded };
}
