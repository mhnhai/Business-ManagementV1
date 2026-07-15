# Trạng thái đơn hàng và thanh toán

## Payment status (trên Activity)

- `unpaid`: chưa thanh toán
- `partial`: thanh toán một phần
- `paid`: đã thanh toán đủ

## Order status

Các mã trạng thái nằm trong bảng `order_statuses` (status_code, status_name, sort_order, is_terminal).
Dùng tool `get_order_status_help` để lấy danh sách mới nhất từ DB.

Admin có thể `confirm` và `advance-status` trên activity để chuyển bước xử lý.

## Gợi ý câu hỏi cho Trợ lý AI

- "Doanh số từ ngày A đến ngày B?"
- "Công nợ khách tên ...?"
- "Tồn kho sản phẩm ...?"
- "Đơn gần đây của khách id ...?"
- "Cách duyệt khách hàng mới?"
