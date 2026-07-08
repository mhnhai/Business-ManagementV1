/** Province Open API v2 — sau sáp nhập 07/2025. @see https://provinces.open-api.vn/ */
export const PROVINCES_API_V2_BASE = 'https://provinces.open-api.vn/api/v2';

/** Mã tỉnh/thành Cần Thơ (api/v2). */
export const CAN_THO_PROVINCE_CODE = 92;

export const CAN_THO_PROVINCE_NAME = 'Thành phố Cần Thơ';

export const WARD_DIVISION_TYPES = ['phường', 'xã'] as const;

export type ProvinceWard = {
  name: string;
  code: number;
  division_type: string;
  codename: string;
  province_code: number;
};

export type ProvinceWithWards = {
  name: string;
  code: number;
  division_type: string;
  codename: string;
  phone_code: number;
  wards: ProvinceWard[];
};
