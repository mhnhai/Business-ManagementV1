import type { Activity, ActivityDetail, Customer } from "@/lib/types";

export type SalesInvoicePrintData = {
  invoiceNumber: number;
  activityId: number;
  activityDate: string;
  sellerName: string;
  customer: {
    companyName: string;
    representativeName: string;
    phoneNumber: string;
    businessType?: string;
  };
  lines: Array<{
    index: number;
    productName: string;
    quantity: number;
    salePrice: number;
    lineTotal: number;
  }>;
  totalAmount: number;
  content?: string;
  paymentStatusLabel?: string;
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "Chưa thanh toán",
  partial: "Thanh toán một phần",
  paid: "Đã thanh toán",
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildInvoiceHtml(data: SalesInvoicePrintData) {
  const rows = data.lines
    .map(
      (line) => `
        <tr>
          <td class="center">${line.index}</td>
          <td>${escapeHtml(line.productName)}</td>
          <td class="center">${line.quantity}</td>
          <td class="right">${formatMoney(line.salePrice)}</td>
          <td class="right">${formatMoney(line.lineTotal)}</td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Hóa đơn #${data.invoiceNumber}</title>
  <style>
    @page {
      size: A5 portrait;
      margin: 10mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #111;
      margin: 0;
      padding: 0;
    }
    .sheet {
      width: 100%;
      max-width: 128mm;
      margin: 0 auto;
    }
    .company {
      text-align: center;
      border-bottom: 2px solid #111;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .company h1 {
      margin: 0;
      font-size: 15px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .company p {
      margin: 2px 0 0;
      font-size: 10px;
      color: #444;
    }
    .title {
      text-align: center;
      font-size: 14px;
      font-weight: 700;
      margin: 0 0 10px;
      text-transform: uppercase;
    }
    .meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 12px;
      margin-bottom: 10px;
      font-size: 10px;
    }
    .meta .label { color: #555; }
    .block {
      border: 1px solid #ccc;
      padding: 8px;
      margin-bottom: 10px;
      font-size: 10px;
    }
    .block strong { display: inline-block; min-width: 88px; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin-bottom: 8px;
    }
    th, td {
      border: 1px solid #999;
      padding: 4px 5px;
      vertical-align: top;
    }
    th {
      background: #f3f3f3;
      font-weight: 600;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .total-row {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12px;
      font-size: 12px;
      font-weight: 700;
      margin: 8px 0 12px;
    }
    .note {
      font-size: 10px;
      color: #444;
      margin-bottom: 16px;
      min-height: 24px;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 20px;
      text-align: center;
      font-size: 10px;
    }
    .signatures .role {
      font-weight: 600;
      margin-bottom: 48px;
    }
    .signatures .hint {
      font-style: italic;
      color: #666;
      font-size: 9px;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="company">
      <h1>Business Management</h1>
      <p>Hệ thống quản lý kinh doanh</p>
    </div>

    <p class="title">Hóa đơn bán hàng</p>

    <div class="meta">
      <div><span class="label">Số hóa đơn:</span> <strong>#${data.invoiceNumber}</strong></div>
      <div><span class="label">Mã hoạt động:</span> #${data.activityId}</div>
      <div><span class="label">Ngày lập:</span> ${formatDate(data.activityDate)}</div>
      <div><span class="label">Nhân viên:</span> ${escapeHtml(data.sellerName)}</div>
      ${
        data.paymentStatusLabel
          ? `<div><span class="label">Thanh toán:</span> ${escapeHtml(data.paymentStatusLabel)}</div>`
          : ""
      }
    </div>

    <div class="block">
      <div><strong>Khách hàng:</strong> ${escapeHtml(data.customer.companyName)}</div>
      <div><strong>Người đại diện:</strong> ${escapeHtml(data.customer.representativeName)}</div>
      <div><strong>Điện thoại:</strong> ${escapeHtml(data.customer.phoneNumber)}</div>
      ${
        data.customer.businessType
          ? `<div><strong>Lĩnh vực:</strong> ${escapeHtml(data.customer.businessType)}</div>`
          : ""
      }
    </div>

    <table>
      <thead>
        <tr>
          <th class="center" style="width:28px">STT</th>
          <th>Sản phẩm</th>
          <th class="center" style="width:36px">SL</th>
          <th class="right" style="width:72px">Đơn giá</th>
          <th class="right" style="width:80px">Thành tiền</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="5" class="center">Không có chi tiết</td></tr>'}
      </tbody>
    </table>

    <div class="total-row">
      <span>Tổng cộng:</span>
      <span>${formatMoney(data.totalAmount)} đ</span>
    </div>

    ${
      data.content
        ? `<div class="note"><strong>Ghi chú:</strong> ${escapeHtml(data.content)}</div>`
        : ""
    }

    <div class="signatures">
      <div>
        <div class="role">Người mua hàng</div>
        <div class="hint">(Ký, ghi rõ họ tên)</div>
      </div>
      <div>
        <div class="role">Người bán hàng</div>
        <div class="hint">(Ký, ghi rõ họ tên)</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function printSalesInvoice(data: SalesInvoicePrintData) {
  const html = buildInvoiceHtml(data);

  const iframe = document.createElement("iframe");
  iframe.setAttribute(
    "title",
    `Hóa đơn #${data.invoiceNumber}`,
  );
  iframe.setAttribute(
    "style",
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden",
  );
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDoc = frameWindow?.document;
  if (!frameWindow || !frameDoc) {
    iframe.remove();
    throw new Error("Không thể mở vùng in hóa đơn.");
  }

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  const cleanup = () => {
    iframe.remove();
  };

  const triggerPrint = () => {
    frameWindow.focus();
    frameWindow.print();
  };

  if (frameDoc.readyState === "complete") {
    setTimeout(triggerPrint, 100);
  } else {
    iframe.onload = () => {
      setTimeout(triggerPrint, 100);
    };
  }

  frameWindow.addEventListener("afterprint", cleanup, { once: true });
  setTimeout(cleanup, 60_000);
}

export function buildSalesInvoicePrintData(input: {
  activity: Activity;
  details: ActivityDetail[];
  customer: Customer | undefined;
  sellerName: string;
}): SalesInvoicePrintData {
  const { activity, details, customer, sellerName } = input;
  const totalAmount =
    details.length > 0
      ? details.reduce((sum, line) => sum + line.lineTotal, 0)
      : 0;

  return {
    invoiceNumber: activity.invoiceId ?? activity.id,
    activityId: activity.id,
    activityDate: activity.activityDate,
    sellerName,
    customer: {
      companyName: customer?.companyName ?? `Khách hàng #${activity.customerId}`,
      representativeName: customer?.representativeName ?? "—",
      phoneNumber: customer?.phoneNumber ?? "—",
      businessType: customer?.businessType,
    },
    lines: details.map((line, index) => ({
      index: index + 1,
      productName: line.productName,
      quantity: line.quantity,
      salePrice: line.salePrice,
      lineTotal: line.lineTotal,
    })),
    totalAmount,
    content: activity.content,
    paymentStatusLabel:
      PAYMENT_STATUS_LABELS[activity.paymentStatus] ?? activity.paymentStatus,
  };
}
