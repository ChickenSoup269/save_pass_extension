Markdown

# 🔐 LocalPass – Securely store passwords locally in your browser

**LocalPass** is a Chrome extension that helps you **store passwords directly on your machine**, no server, no account, no cloud – **absolute security and privacy**.

---

## ✨ Main Features

- 🧠 **Automatic login page recognition**
- 💾 **Save username and password to the browser** (via `chrome.storage.local`)
- 🔐 **Encrypt passwords with a master password (AES)**
- 🔍 **Automatically fill in login information if already saved**
- 📥 **Simple popup interface for viewing and editing**
- 📄 **Export password data to a JSON file**
- 📤 **Integrates with a comprehensive Web UI for password management (Next.js/Vercel)**
- 🖱 **Add a right-click menu to quickly save login information**

---

## 🛡️ Why "Local"?

- ❌ No account needed
- ❌ No cloud synchronization
- ✅ Data is encrypted & stored directly on your machine
- ✅ You have full control – "exposure" means you've lost your device 😄

---

## 🚀 Installation (Development - DEV)

### 1. Clone the repo:

```bash
git clone [https://github.com/ChickenSoup269/save_pass_extension.git](https://github.com/ChickenSoup269/save_pass_extension.git)
2. Open Chrome and navigate to:
Bash

chrome://extensions/
3. Enable Developer Mode
4. Click "Load Unpacked"
5. Select the directory containing the manifest.json file
📤 Web UI for management (optional)
You can use the LocalPass web UI to:

View all saved passwords

Search by domain

Decrypt from an exported JSON file

👉 Deploy for free via Vercel or use the pre-built version here:
https://localpass.vercel.app (if you have your own build)

📁 Folder Structure
Bash

📦 localpass-extension/
┣ 📄 manifest.json
┣ 📄 background.js
┣ 📄 content.js
┣ 📄 popup.html
┣ 📄 popup.js
┣ 📄 style.css
┣ 📄 icon.png
Required Permissions
Bash

"permissions": [
  "storage",
  "activeTab",
  "scripting",
  "contextMenus"
]
=> "All permissions are necessary for the extension to function normally – nothing suspicious."

📌 Note
Data stored in chrome.storage.local will not sync between devices.

If you change devices – you need to export and import manually.

Set a strong master password as it is the only key to decrypt your passwords.

❤️ Author
Parameter	Type
Developed by:	ChickenSoup269

Export to Sheets
🛠 Future Plans
Manual synchronization via file

Biometric authentication (if browser supports)

Automatic encrypted backup

🧠 Funny Quote
"If your password is leaked, you probably lost your machine too 😄"
```
