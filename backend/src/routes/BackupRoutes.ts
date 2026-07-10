import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import BackupService from '@src/services/BackupService';

import { Req, Res } from './common/express-types';

async function exportData(_: Req, res: Res) {
  const payload = await BackupService.exportAll();
  const filename = BackupService.buildBackupFilename();
  const json = JSON.stringify(payload, null, 2);

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(HttpStatusCodes.OK).send(json);
}

async function restore(req: Req, res: Res) {
  const result = await BackupService.restoreAll(req.body);
  res.status(HttpStatusCodes.OK).json(result);
}

export default {
  exportData,
  restore,
} as const;
