import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import ExcelJS from 'exceljs';

import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import { PaymentStatusLabels } from '@src/common/constants/payment-status';
import { RouteError } from '@src/common/utils/route-errors';
import ActivityRepo from '@src/repos/ActivityRepo';
import OrderStatusRepo from '@src/repos/OrderStatusRepo';

dayjs.extend(customParseFormat);

const HEADERS = [
  'Mã hoạt động',
  'Ngày hoạt động',
  'Nhân viên',
  'Khách hàng',
  'Trạng thái',
  'Thanh toán',
  'Mã hóa đơn',
  'Tổng hóa đơn',
  'Nội dung',
  'Sản phẩm',
  'Số lượng',
  'Giá bán',
  'Thành tiền',
] as const;

function parseDateRange(fromDate: string, toDate: string) {
  const from = dayjs(fromDate, 'YYYY-MM-DD', true);
  const to = dayjs(toDate, 'YYYY-MM-DD', true);

  if (!from.isValid() || !to.isValid()) {
    throw new RouteError(
      HttpStatusCodes.BAD_REQUEST,
      'fromDate và toDate phải có định dạng YYYY-MM-DD',
    );
  }
  if (to.isBefore(from, 'day')) {
    throw new RouteError(
      HttpStatusCodes.BAD_REQUEST,
      'Ngày kết thúc không được trước ngày bắt đầu',
    );
  }

  return {
    from: from.startOf('day').toDate(),
    toExclusive: to.add(1, 'day').startOf('day').toDate(),
  };
}

function formatActivityDate(value: Date) {
  return dayjs(value).format('DD/MM/YYYY HH:mm');
}

async function buildExcel(
  fromDate: string,
  toDate: string,
  userId?: number,
): Promise<Buffer> {
  const { from, toExclusive } = parseDateRange(fromDate, toDate);
  const [activities, statuses] = await Promise.all([
    ActivityRepo.getForExport(from, toExclusive, userId),
    OrderStatusRepo.getAll(),
  ]);

  const statusMap = Object.fromEntries(
    statuses.map((s) => [s.status_code, s.status_name]),
  );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Business Management';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Hoạt động', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.addRow([...HEADERS]);
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  sheet.columns = [
    { width: 14 },
    { width: 18 },
    { width: 22 },
    { width: 24 },
    { width: 16 },
    { width: 18 },
    { width: 12 },
    { width: 14 },
    { width: 28 },
    { width: 24 },
    { width: 10 },
    { width: 14 },
    { width: 14 },
  ];

  let grandTotal = 0;

  for (const activity of activities) {
    const employeeName =
      activity.user.full_name || activity.user.username;
    const customerName = activity.customer.company_name;
    const statusLabel = statusMap[activity.status] ?? activity.status;
    const paymentLabel =
      PaymentStatusLabels[
        activity.payment_status
      ] ?? activity.payment_status;
    const invoiceTotal = activity.invoice
      ? Number(activity.invoice.total_amount)
      : null;
    if (invoiceTotal !== null) {
      grandTotal += invoiceTotal;
    }

    const base = [
      activity.activity_id,
      formatActivityDate(activity.activity_date),
      employeeName,
      customerName,
      statusLabel,
      paymentLabel,
      activity.invoice_id ?? '',
      invoiceTotal,
      activity.content,
    ];

    if (activity.details.length === 0) {
      sheet.addRow([...base, '', '', '', '']);
      continue;
    }

    for (const detail of activity.details) {
      const salePrice = Number(detail.sale_price);
      const lineTotal = salePrice * detail.quantity;
      sheet.addRow([
        ...base,
        detail.product.product_name,
        detail.quantity,
        salePrice,
        lineTotal,
      ]);
    }
  }

  if (activities.length === 0) {
    sheet.addRow(['Không có hoạt động trong khoảng thời gian đã chọn']);
  } else {
    const summaryRow = sheet.addRow([
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

  const moneyCols = [8, 12, 13];
  for (const col of moneyCols) {
    sheet.getColumn(col).numFmt = '#,##0';
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export default {
  buildExcel,
  parseDateRange,
} as const;
