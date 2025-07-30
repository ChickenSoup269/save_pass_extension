# 🔐 LocalPass – Lưu mật khẩu an toàn, cục bộ trên trình duyệt

**LocalPass** là một tiện ích mở rộng Chrome giúp bạn **lưu trữ mật khẩu trực tiếp trên máy**, không cần server, không cần tài khoản, không có đám mây – **an toàn và riêng tư tuyệt đối**.

---

## ✨ Tính năng chính

- 🧠 **Tự động nhận dạng trang web đăng nhập**
- 💾 **Lưu username và password vào trình duyệt** (qua `chrome.storage.local`)
- 🔐 **Mã hóa mật khẩu bằng master password (AES)**
- 🔍 **Tự động điền lại thông tin đăng nhập nếu đã lưu**
- 📥 **Giao diện popup đơn giản để xem và chỉnh sửa**
- 📄 **Export dữ liệu mật khẩu ra file JSON**
- 📤 **Tích hợp với Web UI quản lý mật khẩu toàn cảnh (Next.js/Vercel)**
- 🖱 **Thêm menu chuột phải để lưu nhanh thông tin đăng nhập**

---

## 🛡️ Tại sao lại "Local"?

- ❌ Không cần tài khoản
- ❌ Không đồng bộ qua cloud
- ✅ Dữ liệu mã hóa & lưu trực tiếp trên máy bạn
- ✅ Bạn toàn quyền kiểm soát – "bị lộ" là do bạn mất máy 😄

---

## 🚀 Cách cài đặt (phát triển - DEV)

### 1. Clone repo:

```bash
git clone https://github.com/ChickenSoup269/save_pass_extension.git
```

### 2. Mở Chrome và truy cập:

```bash
chrome://extensions/
```

### 3. Bật Chế độ dành cho nhà phát triển (Developer Mode)

### 4. Click "Tải tiện ích đã giải nén" (Load Unpacked)

### 5. Chọn thư mục chứa file manifest.json

### 📤 Web UI quản lý (tùy chọn)

- Bạn có thể dùng bản web UI của LocalPass để:
- Xem toàn bộ mật khẩu đã lưu
- Tìm kiếm theo domain
- Giải mã từ file export JSON

👉 Deploy miễn phí qua Vercel hoặc dùng bản mình dựng sẵn tại:
https://localpass.vercel.app (nếu bạn có build riêng)

### 📁 Cấu trúc thư mục

```bash
📦 localpass-extension/
┣ 📄 manifest.json
┣ 📄 background.js
┣ 📄 content.js
┣ 📄 popup.html
┣ 📄 popup.js
┣ 📄 style.css
┣ 📄 icon.png
```

### Quyền yêu cầu

```bash
"permissions": [
  "storage",
  "activeTab",
  "scripting",
  "contextMenus"
]
```

=> "Tất cả quyền đều cần thiết để tiện ích hoạt động bình thường – không có gì mờ ám."

### 📌 Lưu ý

Dữ liệu lưu trong chrome.storage.local nên sẽ không đồng bộ giữa các thiết bị

Nếu đổi máy – bạn cần export và import thủ công

Hãy đặt master password mạnh vì nó là chìa khóa duy nhất để giải mã mật khẩu

### ❤️ Tác giả

| Parameter         | Type           |
| :---------------- | :------------- |
| `Phát triển bởi:` | ChickenSoup269 |

🛠 Dự kiến tương lai
Đồng bộ thủ công qua file

Xác thực sinh trắc học (nếu browser hỗ trợ)

Tự động sao lưu có mã hóa

🧠 Trích dẫn vui
"Nếu mật khẩu bạn bị lộ, thì chắc bạn cũng mất luôn cái máy rồi 😄"
