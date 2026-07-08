import {
  isNonEmptyString,
  isString,
  isUnsignedInteger,
} from 'jet-validators';
import { parseObject, Schema, testObject } from 'jet-validators/utils';

import { transformIsDate } from '@src/common/utils/validators';
import { AutoCreatePayload, Entity } from './common/types';

/**
 * @entity suppliers
 */
export interface ISupplier extends Entity {
  supplierName: string;
  businessType: string;
  address: string;
  phoneNumber: string;
  email: string;
}

export type ISupplierWrite = AutoCreatePayload<ISupplier>;

export interface ISupplierUpdate extends ISupplierWrite {
  id: number;
}

const GetDefaults = (): ISupplier => ({
  id: 0,
  supplierName: '',
  businessType: '',
  address: '',
  phoneNumber: '',
  email: '',
  createdAt: new Date(),
  updatedAt: new Date(),
});

const schema = {
  id: isUnsignedInteger,
  supplierName: isString,
  businessType: isString,
  address: isString,
  phoneNumber: isString,
  email: isString,
  createdAt: transformIsDate,
  updatedAt: transformIsDate,
} satisfies Schema<ISupplier>;

const writeSchema = {
  supplierName: isString,
  businessType: isString,
  address: isString,
  phoneNumber: isString,
  email: isString,
} satisfies Schema<ISupplierWrite>;

const updateSchema = {
  id: isUnsignedInteger,
  supplierName: isString,
  businessType: isString,
  address: isString,
  phoneNumber: isString,
  email: isString,
} satisfies Schema<ISupplierUpdate>;

const parseSupplier = parseObject(schema);
const parseSupplierWrite = parseObject(writeSchema);
const parseSupplierUpdate = parseObject(updateSchema);

const isCompleteSupplier = testObject<ISupplier>({
  ...schema,
  supplierName: isNonEmptyString,
  businessType: isNonEmptyString,
  address: isNonEmptyString,
  phoneNumber: isNonEmptyString,
  email: isNonEmptyString,
});

const isCompleteSupplierWrite = testObject<ISupplierWrite>({
  ...writeSchema,
  supplierName: isNonEmptyString,
  businessType: isNonEmptyString,
  address: isNonEmptyString,
  phoneNumber: isNonEmptyString,
  email: isNonEmptyString,
});

const isCompleteSupplierUpdate = testObject<ISupplierUpdate>({
  ...updateSchema,
  supplierName: isNonEmptyString,
  businessType: isNonEmptyString,
  address: isNonEmptyString,
  phoneNumber: isNonEmptyString,
  email: isNonEmptyString,
});

function new_(supplier?: Partial<ISupplier>): ISupplier {
  return parseSupplier({ ...GetDefaults(), ...supplier }, (errors) => {
    throw new Error(
      'Setup new supplier failed ' + JSON.stringify(errors, null, 2),
    );
  });
}

function newWrite(supplier?: Partial<ISupplierWrite>): ISupplierWrite {
  return parseSupplierWrite(
    {
      supplierName: '',
      businessType: '',
      address: '',
      phoneNumber: '',
      email: '',
      ...supplier,
    },
    (errors) => {
      throw new Error(
        'Setup supplier write failed ' + JSON.stringify(errors, null, 2),
      );
    },
  );
}

function newUpdate(supplier?: Partial<ISupplierUpdate>): ISupplierUpdate {
  return parseSupplierUpdate(
    {
      id: 0,
      supplierName: '',
      businessType: '',
      address: '',
      phoneNumber: '',
      email: '',
      ...supplier,
    },
    (errors) => {
      throw new Error(
        'Setup supplier update failed ' + JSON.stringify(errors, null, 2),
      );
    },
  );
}

export default {
  new: new_,
  newWrite,
  newUpdate,
  isComplete: isCompleteSupplier,
  isCompleteWrite: isCompleteSupplierWrite,
  isCompleteUpdate: isCompleteSupplierUpdate,
} as const;
