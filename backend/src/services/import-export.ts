import dayjs from 'dayjs';
import ExcelJS from 'exceljs';

import ImportRepo from '@src/repos/ImportRepo';
import ActivityExportService from '@src/services/activity-export';

const HEADERS = [
  'Mã phiếu nhập',
  'Ngày nhập',
  'Nhà cung cấp',
  'Nội dung',
  'Sản phẩm',
  'Giá bán',
  'Giá nhập',
  'Số lượng',
  'Thành tiền',
] as const;

function formatImportDate(value: Date) {
  return dayjs(value).format('DD/MM/YYYY HH:mm');
}

async function buildExcel(fromDate: string, toDate: string): Promise<Buffer> {
  const { from, toExclusive } = ActivityExportService.parseDateRange(
    fromDate,
    toDate,
  );
  const imports = await ImportRepo.getForExport(from, toExclusive);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Business Management';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Nhập hàng', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.addRow([...HEADERS]);
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  sheet.columns = [
    { width: 14 },
    { width: 18 },
    { width: 24 },
    { width: 28 },
    { width: 24 },
    { width: 14 },
    { width: 14 },
    { width: 10 },
    { width: 14 },
  ];

  let grandTotal = 0;

  for (const record of imports) {
    const base = [
      record.import_id,
      formatImportDate(record.import_date),
      record.supplier.supplier_name,
      record.content,
    ];

    if (record.details.length === 0) {
      sheet.addRow([...base, '', '', '', '', '']);
      continue;
    }

    for (const detail of record.details) {
      const importPrice = Number(detail.import_price);
      const lineTotal = importPrice * detail.quantity;
      grandTotal += lineTotal;

      sheet.addRow([
        ...base,
        detail.product.product_name,
        Number(detail.product.unit_price),
        importPrice,
        detail.quantity,
        lineTotal,
      ]);
    }
  }

  if (imports.length === 0) {
    sheet.addRow(['Không có phiếu nhập trong khoảng thời gian đã chọn']);
  } else {
    const summaryRow = sheet.addRow([
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'Tổng cộng',
      grandTotal,
    ]);
    summaryRow.font = { bold: true };
  }

  for (const col of [6, 7, 9]) {
    sheet.getColumn(col).numFmt = '#,##0';
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export default {
  buildExcel,
} as const;
