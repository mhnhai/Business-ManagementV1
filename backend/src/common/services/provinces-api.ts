import {
  CAN_THO_PROVINCE_CODE,
  CAN_THO_PROVINCE_NAME,
  PROVINCES_API_V2_BASE,
  ProvinceWithWards,
  ProvinceWard,
  WARD_DIVISION_TYPES,
} from '@src/common/constants/provinces-api';

/******************************************************************************
                                Functions
******************************************************************************/

/**
 * Lấy danh sách xã/phường thuộc Thành phố Cần Thơ từ Province Open API v2.
 */
export async function fetchCanThoWards(): Promise<ProvinceWard[]> {
  const url = `${PROVINCES_API_V2_BASE}/p/${CAN_THO_PROVINCE_CODE}?depth=2`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Provinces API failed (${response.status}): ${response.statusText}`,
    );
  }

  const province = (await response.json()) as ProvinceWithWards;

  if (province.code !== CAN_THO_PROVINCE_CODE) {
    throw new Error('Unexpected province code from Provinces API');
  }

  return province.wards.filter((ward) =>
    (WARD_DIVISION_TYPES as readonly string[]).includes(ward.division_type),
  );
}

export function wardToLocationFields(ward: ProvinceWard) {
  return {
    province: CAN_THO_PROVINCE_NAME,
    ward: ward.name,
    wardCode: ward.code,
  };
}
