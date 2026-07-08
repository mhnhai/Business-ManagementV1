import { isNonEmptyString, isString, isUnsignedInteger } from 'jet-validators';
import { parseObject, Schema, testObject } from 'jet-validators/utils';

import { transformIsDate } from '@src/common/utils/validators';
import { Entity } from './common/types';

/**
 * @entity locations
 */
export interface ILocation extends Entity {
  province: string;
  ward: string;
  /** Mã xã/phường từ Province Open API v2 (Cần Thơ). */
  wardCode: number;
}

const GetDefaults = (): ILocation => ({
  id: 0,
  province: '',
  ward: '',
  wardCode: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const schema = {
  id: isUnsignedInteger,
  province: isString,
  ward: isString,
  wardCode: isUnsignedInteger,
  createdAt: transformIsDate,
  updatedAt: transformIsDate,
} satisfies Schema<ILocation>;

const parseLocation = parseObject(schema);

const isCompleteLocation = testObject<ILocation>({
  ...schema,
  province: isNonEmptyString,
  ward: isNonEmptyString,
  wardCode: isUnsignedInteger,
});

function new_(location?: Partial<ILocation>): ILocation {
  return parseLocation({ ...GetDefaults(), ...location }, (errors) => {
    throw new Error(
      'Setup new location failed ' + JSON.stringify(errors, null, 2),
    );
  });
}

export default {
  new: new_,
  isComplete: isCompleteLocation,
} as const;
