import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import { ISessionUser } from '@src/models/common/types';
import AssistantService from '@src/services/AssistantService';
import * as Knowledge from '@src/services/assistant/AssistantKnowledgeService';

import { Req, Res } from './common/express-types';

async function chat(req: Req, res: Res) {
  const session = res.locals.sessionUser as ISessionUser;
  const body = req.body as unknown as {
    messages?: { role: 'user' | 'assistant'; content: string }[];
  };

  const result = await AssistantService.chat(
    body.messages ?? [],
    session.userId,
  );
  res.status(HttpStatusCodes.OK).json(result);
}

async function health(_req: Req, res: Res) {
  const status = await AssistantService.health();
  res.status(HttpStatusCodes.OK).json(status);
}

async function knowledgeSync(_req: Req, res: Res) {
  const result = await Knowledge.syncKnowledgeToFileSearch();
  res.status(HttpStatusCodes.OK).json(result);
}

export default {
  chat,
  health,
  knowledgeSync,
} as const;
