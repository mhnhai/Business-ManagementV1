require("dotenv").config({ path: "./config/.env.development" });
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const SEED_PASSWORD = "123456";
const hashPassword = () => bcrypt.hash(SEED_PASSWORD, 12);

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing for seed script");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const PROVINCES_API_V2_BASE = "https://provinces.open-api.vn/api/v2";
const CAN_THO_PROVINCE_CODE = 92;
const CAN_THO_PROVINCE_NAME = "Thành phố Cần Thơ";
const WARD_DIVISION_TYPES = ["phường", "xã"];

async function syncCanThoLocations() {
  const response = await fetch(
    `${PROVINCES_API_V2_BASE}/p/${CAN_THO_PROVINCE_CODE}?depth=2`,
  );
  if (!response.ok) {
    throw new Error(`Provinces API failed: ${response.status}`);
  }
  const province = await response.json();
  const wards = province.wards.filter((w) =>
    WARD_DIVISION_TYPES.includes(w.division_type),
  );

  for (const ward of wards) {
    await prisma.location.upsert({
      where: { ward_code: ward.code },
      create: {
        province: CAN_THO_PROVINCE_NAME,
        ward: ward.name,
        ward_code: ward.code,
      },
      update: {
        province: CAN_THO_PROVINCE_NAME,
        ward: ward.name,
      },
    });
  }

  return wards.length;
}

const ORDER_STATUSES = [
  { status_code: "draft", status_name: "Nháp", sort_order: 1, is_terminal: false },
  {
    status_code: "confirmed",
    status_name: "Đã xác nhận",
    sort_order: 2,
    is_terminal: false,
  },
  {
    status_code: "processing",
    status_name: "Đang xử lý",
    sort_order: 3,
    is_terminal: false,
  },
  {
    status_code: "completed",
    status_name: "Hoàn thành",
    sort_order: 4,
    is_terminal: true,
  },
];

async function seedOrderStatuses() {
  for (const row of ORDER_STATUSES) {
    await prisma.orderStatus.upsert({
      where: { status_code: row.status_code },
      create: row,
      update: {
        status_name: row.status_name,
        sort_order: row.sort_order,
        is_terminal: row.is_terminal,
      },
    });
  }
}

/** Bảng lương theo tháng cho admin và nhân viên (3 tháng gần nhất). */
async function seedSalaries(users) {
  const year = 2026;
  const months = [3, 4, 5];

  const templates = {
    admin: [
      { base: 25000000, commission: 0, bonus: 2000000 },
      { base: 25000000, commission: 0, bonus: 2500000 },
      { base: 25000000, commission: 0, bonus: 3000000 },
    ],
    nhanvien01: [
      { base: 12000000, commission: 1800000, bonus: 500000 },
      { base: 12000000, commission: 2200000, bonus: 700000 },
      { base: 12000000, commission: 3100000, bonus: 1000000 },
    ],
    nhanvien02: [
      { base: 11500000, commission: 1500000, bonus: 400000 },
      { base: 11500000, commission: 1900000, bonus: 600000 },
      { base: 11500000, commission: 2400000, bonus: 800000 },
    ],
  };

  const byUsername = Object.fromEntries(users.map((u) => [u.username, u]));

  for (let i = 0; i < months.length; i++) {
    const month = months[i];
    for (const [username, rows] of Object.entries(templates)) {
      const user = byUsername[username];
      if (!user) continue;
      const row = rows[i];
      await prisma.salary.create({
        data: {
          user_id: user.user_id,
          month,
          year,
          base_salary: row.base.toFixed(2),
          commission: row.commission.toFixed(2),
          bonus: row.bonus.toFixed(2),
        },
      });
    }
  }
}

function loadProductsFromJson() {
  const filePath = path.join(__dirname, "..", "products.json");
  const raw = fs.readFileSync(filePath, "utf8");
  const items = JSON.parse(raw);

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("products.json must be a non-empty array");
  }

  return items.map((item) => ({
    product_name: item.product_name,
    unit_price: Number(item.unit_price).toFixed(2),
    stock_quantity: Number(item.stock_quantity),
  }));
}

/** Xáo trộn mảng theo seed cố định để seed chạy lại cho cùng kết quả. */
function shuffleDeterministic(items, seed = 20260517) {
  const arr = [...items];
  let state = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    const j = state % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const BUSINESS_TYPES = [
  "Thuong mai",
  "Phan phoi",
  "Xay dung",
  "Dich vu",
  "Nha hang",
  "Bia ruou",
];

const REPRESENTATIVE_NAMES = [
  "Nguyen Van C",
  "Tran Thi D",
  "Le Van E",
  "Pham Thi F",
  "Hoang Van G",
  "Vo Thi H",
  "Dang Van I",
  "Bui Thi K",
  "Do Van L",
  "Ngo Thi M",
  "Ly Van N",
  "Mai Thi O",
  "Truong Van P",
  "Huynh Thi Q",
  "Lam Van R",
  "Phan Thi S",
  "Cao Van T",
  "Duong Thi U",
  "Ton Van V",
  "Luong Thi X",
];

/** Tọa độ gần đúng quanh khu vực Cần Thơ (mỗi KH một điểm hơi lệch). */
function canThoCoords(index) {
  const lat = 10.01 + (index % 5) * 0.012 + (index % 3) * 0.003;
  const lng = 105.72 + Math.floor(index / 5) * 0.018 + (index % 4) * 0.004;
  return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
}

function customerPhone(index) {
  return `09${String(index + 1).padStart(8, "0")}`;
}

function seedSalePrice(unitPrice, markup = 1) {
  return Math.round(Number(unitPrice) * markup).toFixed(2);
}

/**
 * Tao don hang kem chi tiet; don da xac nhan tro len co hoa don.
 */
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
  paidRatio = 0.5,
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

  if (lines.length === 0) {
    return activity;
  }

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

  if (status === "draft") {
    return activity;
  }

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
  } else if (paymentStatus === "partial") {
    const paidAmount = Math.max(1, Math.floor(total * paidRatio));
    await prisma.payment.create({
      data: {
        activity_id: activity.activity_id,
        paid_amount: paidAmount.toFixed(2),
        payment_date: deliveryDate ?? activityDate,
        method: paymentMethod,
      },
    });
  }

  return activity;
}

function seedDate(year, month, day, hour = 9, minute = 0) {
  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
}

function deliveryAfter(activityDate, days = 1) {
  const d = new Date(activityDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function calcOrderTotal(activity) {
  if (activity.invoice?.total_amount != null) {
    return Number(activity.invoice.total_amount);
  }
  if (activity.details?.length) {
    return activity.details.reduce(
      (sum, det) => sum + det.quantity * Number(det.sale_price),
      0,
    );
  }
  return 0;
}

function calcOutstandingDebt(activities) {
  return activities
    .filter((a) => a.status !== "draft" && a.status !== "cancelled")
    .reduce((sum, activity) => {
      const orderTotal = calcOrderTotal(activity);
      const orderPaid = (activity.payments ?? []).reduce(
        (paid, p) => paid + Number(p.paid_amount),
        0,
      );
      const remaining = orderTotal - orderPaid;
      return sum + (remaining > 0 ? remaining : 0);
    }, 0);
}

/**
 * Sau khi seed don hang: khach con no -> so du = 0.
 * Khach khong con no co the co vi du (tien tra truoc / tra thua).
 */
async function finalizeSeedCustomerBalances() {
  const customers = await prisma.customer.findMany({
    orderBy: { customer_id: "asc" },
    include: {
      activities: {
        where: { status: { not: "draft" } },
        include: { invoice: true, payments: true, details: true },
      },
    },
  });

  /** Vi du tra truoc cho KH khong con no (theo thu tu KH 01..20). */
  const prepaidIfDebtFree = [
    500_000, // KH 01 - don da tra du, con vi nho
    1_200_000, // KH 02
    800_000, // KH 03
    0, // KH 04 - con no don da chot
    0, // KH 05 - con no (thanh toan 1 phan)
    0, // KH 06 - con no (thanh toan 1 phan)
    600_000, // KH 07
    2_500_000, // KH 08 - chua co don, tra truoc
    1_500_000, // KH 09
    1_000_000, // KH 10 - chua co don
    900_000, // KH 11
    0, // KH 12 - con no don dang giao
    1_100_000, // KH 13
    3_000_000, // KH 14 - chua co don
    750_000, // KH 15
    0, // KH 16 - con no
    1_800_000, // KH 17 - chua co don
    950_000, // KH 18
    400_000, // KH 19
    2_200_000, // KH 20 - chua co don
  ];

  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];
    const debt = calcOutstandingDebt(customer.activities);
    const balance = debt > 0 ? 0 : (prepaidIfDebtFree[i] ?? 0);

    await prisma.customer.update({
      where: { customer_id: customer.customer_id },
      data: { current_balance: balance.toFixed(2) },
    });
  }
}

/**
 * 20 khách hàng — mỗi KH một phường/xã khác nhau.
 * nhanvien01: 10 vùng đầu | nhanvien02: 10 vùng sau (không trùng nhau).
 */
async function seedCustomersAndEmployeeZones(sellerUser01, sellerUser02) {
  const allLocations = await prisma.location.findMany({
    where: { province: CAN_THO_PROVINCE_NAME },
    orderBy: { ward_code: "asc" },
  });

  if (allLocations.length < 20) {
    throw new Error(
      `Can Tho needs at least 20 wards for seed, got ${allLocations.length}`,
    );
  }

  const pickedLocations = shuffleDeterministic(allLocations).slice(0, 20);
  const zonesFor01 = pickedLocations.slice(0, 10);
  const zonesFor02 = pickedLocations.slice(10, 20);

  const customers = [];
  for (let i = 0; i < pickedLocations.length; i++) {
    const loc = pickedLocations[i];
    const coords = canThoCoords(i);
    const customer = await prisma.customer.create({
      data: {
        location_id: loc.location_id,
        company_name: `KH ${String(i + 1).padStart(2, "0")} - ${loc.ward}`,
        business_type: BUSINESS_TYPES[i % BUSINESS_TYPES.length],
        representative_name: REPRESENTATIVE_NAMES[i],
        position: i % 2 === 0 ? "Giam doc" : "Truong phong kinh doanh",
        phone_number: customerPhone(i),
        current_balance: "0.00",
        lat: coords.lat,
        lng: coords.lng,
        is_approved: true,
        approved_at: new Date(),
      },
    });
    customers.push(customer);
  }

  for (const loc of zonesFor01) {
    await prisma.employeeLocation.create({
      data: {
        user_id: sellerUser01.user_id,
        location_id: loc.location_id,
      },
    });
  }

  for (const loc of zonesFor02) {
    await prisma.employeeLocation.create({
      data: {
        user_id: sellerUser02.user_id,
        location_id: loc.location_id,
      },
    });
  }

  return {
    customers,
    zonesFor01: zonesFor01.map((l) => l.ward),
    zonesFor02: zonesFor02.map((l) => l.ward),
  };
}

async function main() {
  await seedOrderStatuses();

  await prisma.payment.deleteMany();
  await prisma.activityDetail.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.importDetail.deleteMany();
  await prisma.import.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.salary.deleteMany();
  await prisma.employeeLocation.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.location.deleteMany();

  const defaultPassword = await hashPassword();

  const adminUser = await prisma.user.create({
    data: {
      username: "admin",
      password: defaultPassword,
      role: "admin",
      full_name: "Quan tri vien",
      department: "IT",
      phone_number: "0900000000",
      email: "admin@company.com",
      is_activated: true
    },
  });
  const sellerUser01 = await prisma.user.create({
    data: {
      username: "nhanvien01",
      password: defaultPassword,
      role: "employee",
      full_name: "Nguyen Van A",
      department: "Sales",
      phone_number: "0912345678",
      email: "seller01@company.com",
      is_activated: true
    },
  });
  const sellerUser02 = await prisma.user.create({
    data: {
      username: "nhanvien02",
      password: defaultPassword,
      role: "employee",
      full_name: "Tran Thi B",
      department: "Marketing",
      phone_number: "0987654321",
      email: "seller02@company.com",
      is_activated: true
    },
  });

  const locationCount = await syncCanThoLocations();

  const { customers, zonesFor01, zonesFor02 } =
    await seedCustomersAndEmployeeZones(sellerUser01, sellerUser02);

  const staffUsers = [sellerUser01, sellerUser02];
  const allUsers = [adminUser, sellerUser01, sellerUser02];
  await seedSalaries(allUsers);

  const productRows = loadProductsFromJson();
  await prisma.product.createMany({ data: productRows });

  const products = await prisma.product.findMany({ orderBy: { product_id: "asc" } });

  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        supplier_name: "Bia Sai Gon",
        business_type: "Phan phoi bia Sai Gon",
        address: "187 Nguyen Chi Thanh, Q1, HCM",
        phone_number: "0283822002",
        email: "contact@sabeco.com.vn",
      },
    }),
    prisma.supplier.create({
      data: {
        supplier_name: "Bia Tiger",
        business_type: "Phan phoi bia Tiger",
        address: "Tan Thuan EPZ, Q7, HCM",
        phone_number: "0283772008",
        email: "sales@tigerbeer.com.vn",
      },
    }),
    prisma.supplier.create({
      data: {
        supplier_name: "Heineken VN",
        business_type: "Phan phoi bia Heineken",
        address: "KCN Di An, Binh Duong",
        phone_number: "0274382288",
        email: "info@heineken-vn.com",
      },
    }),
  ]);

  const import1 = await prisma.import.create({
    data: {
      supplier_id: suppliers[0].supplier_id,
      import_date: new Date("2026-04-05T08:00:00Z"),
      content: "Nhap bia Sai Gon dot 1 quy 2",
    },
  });
  const import2 = await prisma.import.create({
    data: {
      supplier_id: suppliers[1].supplier_id,
      import_date: new Date("2026-04-20T14:30:00Z"),
      content: "Nhap bia Tiger bo sung thang 4",
    },
  });

  if (products.length >= 3) {
    const importPrice = (unitPrice) =>
      Math.round(Number(unitPrice) * 0.85).toFixed(2);

    await prisma.importDetail.createMany({
      data: [
        {
          import_id: import1.import_id,
          product_id: products[0].product_id,
          quantity: 30,
          import_price: importPrice(products[0].unit_price),
        },
        {
          import_id: import1.import_id,
          product_id: products[2].product_id,
          quantity: 50,
          import_price: importPrice(products[2].unit_price),
        },
        {
          import_id: import2.import_id,
          product_id: products[1].product_id,
          quantity: 15,
          import_price: importPrice(products[1].unit_price),
        },
      ],
    });

    await prisma.product.update({
      where: { product_id: products[0].product_id },
      data: { stock_quantity: { increment: 30 } },
    });
    await prisma.product.update({
      where: { product_id: products[2].product_id },
      data: { stock_quantity: { increment: 50 } },
    });
    await prisma.product.update({
      where: { product_id: products[1].product_id },
      data: { stock_quantity: { increment: 15 } },
    });
  }

  let activities = [];
  if (staffUsers.length >= 2 && customers.length >= 20 && products.length >= 3) {
    const nv01 = staffUsers[0].user_id;
    const nv02 = staffUsers[1].user_id;
    const line = (productIndex, quantity, markup = 1) => ({
      productIndex,
      quantity,
      markup,
    });

    // --- Thang 4/2026: tat ca hoan thanh ---
    activities.push(
      await seedActivityOrder({
        userId: nv01,
        customerId: customers[0].customer_id,
        status: "completed",
        paymentStatus: "paid",
        activityDate: seedDate(2026, 4, 4, 8, 30),
        deliveryDate: deliveryAfter(seedDate(2026, 4, 4), 1),
        content: "Don bia thang 4 - KH 01",
        lines: [line(0, 3), line(2, 2)],
        products,
      }),
      await seedActivityOrder({
        userId: nv01,
        customerId: customers[2].customer_id,
        status: "completed",
        paymentStatus: "paid",
        activityDate: seedDate(2026, 4, 12, 10, 0),
        deliveryDate: deliveryAfter(seedDate(2026, 4, 12), 2),
        content: "Don bia thang 4 - KH 03",
        lines: [line(1, 4)],
        products,
      }),
      await seedActivityOrder({
        userId: nv01,
        customerId: customers[5].customer_id,
        status: "completed",
        paymentStatus: "partial",
        paidRatio: 0.6,
        paymentMethod: "Chuyen khoan",
        activityDate: seedDate(2026, 4, 20, 14, 0),
        deliveryDate: deliveryAfter(seedDate(2026, 4, 20), 1),
        content: "Don bia thang 4 - KH 06",
        lines: [line(3, 2), line(4, 1)],
        products,
      }),
      await seedActivityOrder({
        userId: nv01,
        customerId: customers[8].customer_id,
        status: "completed",
        paymentStatus: "paid",
        activityDate: seedDate(2026, 4, 28, 9, 15),
        deliveryDate: deliveryAfter(seedDate(2026, 4, 28), 1),
        content: "Don bia thang 4 - KH 09",
        lines: [line(5, 2)],
        products,
      }),
      await seedActivityOrder({
        userId: nv02,
        customerId: customers[10].customer_id,
        status: "completed",
        paymentStatus: "paid",
        activityDate: seedDate(2026, 4, 8, 11, 0),
        deliveryDate: deliveryAfter(seedDate(2026, 4, 8), 1),
        content: "Don bia thang 4 - KH 11",
        lines: [line(0, 2), line(6, 1)],
        products,
      }),
      await seedActivityOrder({
        userId: nv02,
        customerId: customers[14].customer_id,
        status: "completed",
        paymentStatus: "paid",
        activityDate: seedDate(2026, 4, 22, 15, 30),
        deliveryDate: deliveryAfter(seedDate(2026, 4, 22), 2),
        content: "Don bia thang 4 - KH 15",
        lines: [line(7, 3)],
        products,
      }),
    );

    // --- Thang 5/2026: tat ca hoan thanh ---
    activities.push(
      await seedActivityOrder({
        userId: nv01,
        customerId: customers[1].customer_id,
        status: "completed",
        paymentStatus: "paid",
        activityDate: seedDate(2026, 5, 3, 8, 0),
        deliveryDate: deliveryAfter(seedDate(2026, 5, 3), 1),
        content: "Don bia thang 5 - KH 02",
        lines: [line(0, 2), line(2, 1)],
        products,
      }),
      await seedActivityOrder({
        userId: nv01,
        customerId: customers[4].customer_id,
        status: "completed",
        paymentStatus: "partial",
        paidRatio: 0.5,
        paymentMethod: "Chuyen khoan",
        activityDate: seedDate(2026, 5, 11, 10, 30),
        deliveryDate: deliveryAfter(seedDate(2026, 5, 11), 1),
        content: "Don bia thang 5 - KH 05",
        lines: [line(2, 2), line(8, 1)],
        products,
      }),
      await seedActivityOrder({
        userId: nv01,
        customerId: customers[6].customer_id,
        status: "completed",
        paymentStatus: "paid",
        activityDate: seedDate(2026, 5, 19, 13, 0),
        deliveryDate: deliveryAfter(seedDate(2026, 5, 19), 2),
        content: "Don bia thang 5 - KH 07",
        lines: [line(9, 2)],
        products,
      }),
      await seedActivityOrder({
        userId: nv02,
        customerId: customers[12].customer_id,
        status: "completed",
        paymentStatus: "paid",
        activityDate: seedDate(2026, 5, 7, 9, 0),
        deliveryDate: deliveryAfter(seedDate(2026, 5, 7), 1),
        content: "Don bia thang 5 - KH 13",
        lines: [line(1, 3)],
        products,
      }),
      await seedActivityOrder({
        userId: nv02,
        customerId: customers[15].customer_id,
        status: "completed",
        paymentStatus: "unpaid",
        activityDate: seedDate(2026, 5, 16, 14, 0),
        deliveryDate: deliveryAfter(seedDate(2026, 5, 16), 1),
        content: "Don bia thang 5 - KH 16 (con no)",
        lines: [line(0, 4)],
        products,
      }),
      await seedActivityOrder({
        userId: nv02,
        customerId: customers[18].customer_id,
        status: "completed",
        paymentStatus: "paid",
        activityDate: seedDate(2026, 5, 27, 16, 0),
        deliveryDate: deliveryAfter(seedDate(2026, 5, 27), 1),
        content: "Don bia thang 5 - KH 19",
        lines: [line(3, 1), line(10, 2)],
        products,
      }),
    );

    // --- Thang 6/2026: don dang xu ly ---
    activities.push(
      await seedActivityOrder({
        userId: nv01,
        customerId: customers[0].customer_id,
        status: "draft",
        paymentStatus: "unpaid",
        activityDate: seedDate(2026, 6, 5, 9, 30),
        content: "Don nhap thang 6 - KH 01",
        lines: [line(0, 2)],
        products,
      }),
      await seedActivityOrder({
        userId: nv01,
        customerId: customers[3].customer_id,
        status: "confirmed",
        paymentStatus: "unpaid",
        activityDate: seedDate(2026, 6, 12, 11, 0),
        content: "Don da chot thang 6 - KH 04",
        lines: [line(2, 2), line(4, 1)],
        products,
      }),
      await seedActivityOrder({
        userId: nv02,
        customerId: customers[11].customer_id,
        status: "processing",
        paymentStatus: "partial",
        paidRatio: 0.4,
        paymentMethod: "Chuyen khoan",
        activityDate: seedDate(2026, 6, 18, 8, 0),
        deliveryDate: seedDate(2026, 6, 19, 8, 0),
        content: "Dang giao hang thang 6 - KH 12",
        lines: [line(0, 3)],
        products,
      }),
      await seedActivityOrder({
        userId: nv02,
        customerId: customers[17].customer_id,
        status: "completed",
        paymentStatus: "paid",
        activityDate: seedDate(2026, 6, 24, 15, 0),
        deliveryDate: seedDate(2026, 6, 25, 9, 0),
        content: "Don hoan thanh thang 6 - KH 18",
        lines: [line(5, 2), line(11, 1)],
        products,
      }),
    );
  }

  await finalizeSeedCustomerBalances();

  const invoiceCount = await prisma.invoice.count();
  const activityCount = await prisma.activity.count();
  const activityDetailCount = await prisma.activityDetail.count();
  const paymentCount = await prisma.payment.count();
  const salaryCount = await prisma.salary.count();
  const supplierCount = await prisma.supplier.count();
  const importCount = await prisma.import.count();
  const importDetailCount = await prisma.importDetail.count();

  console.log("Seed completed:", {
    adminUserId: adminUser.user_id,
    staffUserIds: staffUsers.map((u) => u.user_id),
    canThoLocationCount: locationCount,
    customerCount: customers.length,
    nhanvien01Zones: zonesFor01,
    nhanvien02Zones: zonesFor02,
    productCount: products.length,
    supplierCount,
    importCount,
    importDetailCount,
    invoiceCount,
    activityCount,
    activityDetailCount,
    paymentCount,
    salaryCount,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
