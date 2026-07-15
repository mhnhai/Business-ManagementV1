# Cách dùng module Trợ lý AI (admin)

1. Đăng nhập bằng tài khoản admin.
2. Mở tab **Trợ lý AI** trên thanh điều hướng.
3. Đặt câu hỏi tiếng Việt về doanh số, công nợ, tồn kho, đơn hàng hoặc hướng dẫn.
4. Hệ thống dùng Gemini trên **server**; trình duyệt không thấy API key.
5. Đồng bộ tài liệu File Search (tuỳ chọn): gọi API `POST /api/assistant/knowledge/sync` sau khi có `GEMINI_API_KEY`. Copy `storeName` vào `GEMINI_FILE_SEARCH_STORE` nếu muốn gắn cố định trên môi trường deploy.

## Không dùng Trợ lý AI để

- Xem hoặc tính lương / hoa hồng theo nhân viên
- Tra cứu số tài khoản ngân hàng
- Yêu cầu restore backup hoặc lộ mật khẩu
