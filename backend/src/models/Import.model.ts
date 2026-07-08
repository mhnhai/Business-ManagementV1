import { isNonEmptyString, isUnsignedInteger } from 'jet-validators';
import { parseObject, Schema, testObject } from 'jet-validators/utils';
import { transformIsDate } from '@src/common/utils/validators';

import { Entity } from './common/types';

/**
 * @entity imports
 */
export interface IImport extends Entity {
  supplierId: number;
  importDate: Date;
  content: string;
}

export interface IImportWrite {
  supplierId: number;
  content: string;
}

export interface IImportView extends IImport {
  supplierName?: string;
  totalAmount?: number;
  lineCount?: number;
}

const GetDefaults = (): IImport => ({
  id: 0,
  supplierId: 0,
  importDate: new Date(),
  content: '',
  createdAt: new Date(),
  updatedAt: new Date(),
});

const schema = {
  id: isUnsignedInteger,
  supplierId: isUnsignedInteger,
  importDate: transformIsDate,
  content: isNonEmptyString,
  createdAt: transformIsDate,
  updatedAt: transformIsDate,
} satisfies Schema<IImport>;

const writeSchema = {
  supplierId: isUnsignedInteger,
  content: isNonEmptyString,
} satisfies Schema<IImportWrite>;

const parseImport = parseObject(schema);
const parseImportWrite = parseObject(writeSchema);

const isCompleteImport = testObject<IImport>({
  ...schema,
});

const isCompleteImportWrite = testObject<IImportWrite>(writeSchema);

function new_(record?: Partial<IImport>): IImport {
  return parseImport({ ...GetDefaults(), ...record }, (errors) => {
    throw new Error(
      'Setup new import failed ' + JSON.stringify(errors, null, 2),
    );
  });
}

function newWrite(record?: Partial<IImportWrite>): IImportWrite {
  return parseImportWrite(
    {
      supplierId: 0,
      content: '',
      ...record,
    },
    (errors) => {
      throw new Error(
        'Setup import write failed ' + JSON.stringify(errors, null, 2),
      );
    },
  );
}

export default {
  new: new_,
  newWrite,
  isComplete: isCompleteImport,
  isCompleteWrite: isCompleteImportWrite,
} as const;
