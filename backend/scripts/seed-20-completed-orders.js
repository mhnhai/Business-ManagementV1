/**
 * Tạo 20 đơn hàng hoàn thành cho một khách hàng.
 * Chạy: node scripts/seed-20-completed-orders.js
 * Tuỳ chọn: CUSTOMER_ID=1 node scripts/seed-20-completed-orders.js
 */
require("dotenv").config({ path: "./config/.env.development" });
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const ORDER_COUNT = 20;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function seedSalePrice(unitPrice, markup = 1) {
  return Math.round(Number(unitPrice) * markup).toFixed(2);
}

function seedDate(year, month, day, hour = 9, minute = 0) {
  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
}

function deliveryAfter(activityDate, days = 1) {
  const d = new Date(activityDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function seedActivityOrder({
  userId,
  customerId,
  status,
  paymentStatus,
  activityDate,
  deliveryDate = null,
  content,
  lines,
  products,
  paymentMethod = "Tien mat",
}) {
  const activity = await prisma.activity.create({
    data: {
      user_id: userId,
      customer_id: customerId,
      status,
      payment_status: paymentStatus,
      activity_date: activityDate,
      delivery_date: deliveryDate,
      content: content.slice(0, 50),
    },
  });

  const detailRows = lines.map((line) => ({
    activity_id: activity.activity_id,
    product_id: products[line.productIndex].product_id,
    quantity: line.quantity,
    sale_price: seedSalePrice(
      products[line.productIndex].unit_price,
      line.markup ?? 1,
    ),
  }));

  await prisma.activityDetail.createMany({ data: detailRows });

  const total = detailRows.reduce(
    (sum, row) => sum + Number(row.sale_price) * row.quantity,
    0,
  );

  const invoice = await prisma.invoice.create({
    data: {
      total_amount: total.toFixed(2),
      date: activityDate,
    },
  });

  await prisma.activity.update({
    where: { activity_id: activity.activity_id },
    data: { invoice_id: invoice.invoice_id },
  });

  if (paymentStatus === "paid") {
    await prisma.payment.create({
      data: {
        activity_id: activity.activity_id,
        paid_amount: total.toFixed(2),
        payment_date: deliveryDate ?? activityDate,
        method: paymentMethod,
      },
    });
  }

  return { activity, total };
}

async function main() {
  const customerIdArg = process.env.CUSTOMER_ID
    ? Number(process.env.CUSTOMER_ID)
    : undefined;

  const customer = customerIdArg
    ? await prisma.customer.findUnique({ where: { customer_id: customerIdArg } })
    : await prisma.customer.findFirst({ orderBy: { customer_id: "asc" } });

  if (!customer) {
    throw new Error("Không tìm thấy khách hàng trong database.");
  }

  const user =
    (await prisma.user.findFirst({
      where: { username: "nhanvien01" },
    })) ??
    (await prisma.user.findFirst({
      where: { role: "employee" },
      orderBy: { user_id: "asc" },
    }));

  if (!user) {
    throw new Error("Không tìm thấy nhân viên để gán đơn hàng.");
  }

  const products = await prisma.product.findMany({
    orderBy: { product_id: "asc" },
    take: 5,
  });

  if (products.length === 0) {
    throw new Error("Không có sản phẩm trong database.");
  }

  const created = [];
  const baseDay = 9;

  for (let i = 0; i < ORDER_COUNT; i++) {
    const productIndex = i % products.length;
    const activityDate = seedDate(2026, 7, baseDay + i, 8 + (i % 10), (i * 7) % 60);
    const deliveryDate = deliveryAfter(activityDate, 1);

    const result = await seedActivityOrder({
      userId: user.user_id,
      customerId: customer.customer_id,
      status: "completed",
      paymentStatus: "paid",
      activityDate,
      deliveryDate,
      content: `Don hang #${i + 1} - ${customer.customer_name}`,
      lines: [{ productIndex, quantity: 1 + (i % 3), markup: 1 }],
      products,
    });

    created.push({
      activityId: result.activity.activity_id,
      total: result.total,
    });
  }

  const grandTotal = created.reduce((sum, row) => sum + row.total, 0);

  console.log("Đã tạo 20 đơn hàng hoàn thành:", {
    customerId: customer.customer_id,
    customerName: customer.customer_name,
    seller: user.username,
    activityIds: created.map((r) => r.activityId),
    grandTotal,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
