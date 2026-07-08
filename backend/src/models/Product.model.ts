import { isNonEmptyString, isNumber, isString, isUnsignedInteger } from 'jet-validators';
import { parseObject, Schema, testObject } from 'jet-validators/utils';

import { transformIsDate } from '@src/common/utils/validators';
import { AutoCreatePayload, Entity } from './common/types';

/**
 * @entity products
 */
export interface IProduct extends Entity {
  productName: string;
  unitPrice: number;
  stockQuantity: number;
}

export type IProductWrite = AutoCreatePayload<IProduct>;

export interface IProductUpdate extends IProductWrite {
  id: number;
}

const GetDefaults = (): IProduct => ({
  id: 0,
  productName: '',
  unitPrice: 0,
  stockQuantity: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const schema = {
  id: isUnsignedInteger,
  productName: isString,
  unitPrice: isNumber,
  stockQuantity: isUnsignedInteger,
  createdAt: transformIsDate,
  updatedAt: transformIsDate,
} satisfies Schema<IProduct>;

const writeSchema = {
  productName: isString,
  unitPrice: isNumber,
  stockQuantity: isUnsignedInteger,
} satisfies Schema<IProductWrite>;

const updateSchema = {
  id: isUnsignedInteger,
  productName: isString,
  unitPrice: isNumber,
  stockQuantity: isUnsignedInteger,
} satisfies Schema<IProductUpdate>;

const parseProduct = parseObject(schema);
const parseProductWrite = parseObject(writeSchema);
const parseProductUpdate = parseObject(updateSchema);

const isCompleteProduct = testObject<IProduct>({
  ...schema,
  productName: isNonEmptyString,
  unitPrice: isNumber,
  stockQuantity: isUnsignedInteger,
});

const isCompleteProductWrite = testObject<IProductWrite>({
  ...writeSchema,
  productName: isNonEmptyString,
  unitPrice: isNumber,
  stockQuantity: isUnsignedInteger,
});

const isCompleteProductUpdate = testObject<IProductUpdate>({
  ...updateSchema,
  productName: isNonEmptyString,
  unitPrice: isNumber,
  stockQuantity: isUnsignedInteger,
});

function new_(product?: Partial<IProduct>): IProduct {
  return parseProduct({ ...GetDefaults(), ...product }, (errors) => {
    throw new Error(
      'Setup new product failed ' + JSON.stringify(errors, null, 2),
    );
  });
}

function newWrite(product?: Partial<IProductWrite>): IProductWrite {
  return parseProductWrite(
    {
      productName: '',
      unitPrice: 0,
      stockQuantity: 0,
      ...product,
    },
    (errors) => {
      throw new Error(
        'Setup product write failed ' + JSON.stringify(errors, null, 2),
      );
    },
  );
}

function newUpdate(product?: Partial<IProductUpdate>): IProductUpdate {
  return parseProductUpdate(
    {
      id: 0,
      productName: '',
      unitPrice: 0,
      stockQuantity: 0,
      ...product,
    },
    (errors) => {
      throw new Error(
        'Setup product update failed ' + JSON.stringify(errors, null, 2),
      );
    },
  );
}

export default {
  new: new_,
  newWrite,
  newUpdate,
  isComplete: isCompleteProduct,
  isCompleteWrite: isCompleteProductWrite,
  isCompleteUpdate: isCompleteProductUpdate,
} as const;
