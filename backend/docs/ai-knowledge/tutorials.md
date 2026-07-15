# Hướng dẫn sử dụng hệ thống Quản lý kinh doanh

## Vai trò

- **Admin**: xem thống kê toàn hệ thống, quản lý sản phẩm, NCC, nhập kho, khách hàng, hoạt động, nhân sự, lương, cài đặt (sao lưu), và Trợ lý AI.
- **Nhân viên**: xem thống kê cá nhân, sản phẩm, khách hàng (theo phạm vi), hoạt động.

## Khách hàng

1. Nhân viên có thể tạo khách hàng mới (chờ duyệt).
2. Admin duyệt khách tại module Khách hàng (pending approval).
3. `current_balance` là công nợ / số dư của khách (dương thường nghĩa khách đang nợ hoặc theo quy ước thanh toán của hệ thống).
4. Admin có thể thu tiền (`receive payment`) để giảm công nợ.

## Hoạt động / đơn hàng

1. Tạo activity gắn khách hàng và nhân viên phụ trách.
2. Thêm chi tiết sản phẩm (`activity_details`: số lượng, giá bán).
3. Khi xác nhận, hệ thống có thể tạo hóa đơn (`invoice`).
4. Trạng thái đơn nằm trong bảng `order_statuses` (mã `status` trên activity).
5. Thanh toán: `payment_status` = `unpaid` | `partial` | `paid`; có thể ghi nhiều lần thanh toán (`payments`).

## Sản phẩm & nhập kho

1. Sản phẩm có `unit_price` và `stock_quantity`.
2. Nhập kho: tạo phiếu `imports` gắn `suppliers`, thêm `import_details` để tăng tồn.

## Cài đặt

- Sao lưu / phục hồi DB chỉ dành cho admin trong mục Cài đặt.
- Không dùng Trợ lý AI để yêu cầu restore hay xuất mật khẩu.

## Trợ lý AI — giới hạn

- Chỉ admin được dùng.
- Có thể hỏi: doanh số, công nợ khách, tồn kho, đơn gần đây, nhập kho, cách dùng hệ thống.
- **Không** trả lời lương nhân viên, hoa hồng chi tiết theo người, số tài khoản ngân hàng, mật khẩu.
