import { isNumber, isUnsignedInteger } from 'jet-validators';
import { parseObject, Schema, testObject } from 'jet-validators/utils';

/**
 * @entity import_details
 */
export interface IImportDetail {
  importId: number;
  productId: number;
  quantity: number;
  importPrice: number;
}

export interface IImportDetailView extends IImportDetail {
  productName: string;
  unitPrice: number;
  lineTotal: number;
}

const GetDefaults = (): IImportDetail => ({
  importId: 0,
  productId: 0,
  quantity: 1,
  importPrice: 0,
});

const schema = {
  importId: isUnsignedInteger,
  productId: isUnsignedInteger,
  quantity: isUnsignedInteger,
  importPrice: isNumber,
} satisfies Schema<IImportDetail>;

const parseImportDetail = parseObject(schema);

const isCompleteImportDetail = testObject<IImportDetail>({
  importId: isUnsignedInteger,
  productId: isUnsignedInteger,
  quantity: isUnsignedInteger,
  importPrice: isNumber,
});

function new_(detail?: Partial<IImportDetail>): IImportDetail {
  return parseImportDetail({ ...GetDefaults(), ...detail }, (errors) => {
    throw new Error(
      'Setup import detail failed ' + JSON.stringify(errors, null, 2),
    );
  });
}

export default {
  new: new_,
  isComplete: isCompleteImportDetail,
} as const;
