import { isNumber, isUnsignedInteger } from 'jet-validators';
import { parseObject, Schema, testObject } from 'jet-validators/utils';

/**
 * @entity activity_details
 */
export interface IActivityDetail {
  activityId: number;
  productId: number;
  quantity: number;
  salePrice: number;
}

export interface IActivityDetailView extends IActivityDetail {
  productName: string;
  unitPrice: number;
  lineTotal: number;
}

const GetDefaults = (): IActivityDetail => ({
  activityId: 0,
  productId: 0,
  quantity: 1,
  salePrice: 0,
});

const schema = {
  activityId: isUnsignedInteger,
  productId: isUnsignedInteger,
  quantity: isUnsignedInteger,
  salePrice: isNumber,
} satisfies Schema<IActivityDetail>;

const parseActivityDetail = parseObject(schema);

const isCompleteActivityDetail = testObject<IActivityDetail>({
  activityId: isUnsignedInteger,
  productId: isUnsignedInteger,
  quantity: isUnsignedInteger,
  salePrice: isNumber,
});

function new_(detail?: Partial<IActivityDetail>): IActivityDetail {
  return parseActivityDetail({ ...GetDefaults(), ...detail }, (errors) => {
    throw new Error(
      'Setup activity detail failed ' + JSON.stringify(errors, null, 2),
    );
  });
}

export default {
  new: new_,
  isComplete: isCompleteActivityDetail,
} as const;
