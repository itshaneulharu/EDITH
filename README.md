# 🔍 ClearSight.ai — The X-Ray for Your Website

> **"We turned a 3-hour security investigation into a 3-second solution — for people who don't even know what a server log is."**

![Python](https://img.shields.io/badge/Python-3.9+-blue?style=for-the-badge&logo=python)
![Flask](https://img.shields.io/badge/Flask-Backend-black?style=for-the-badge&logo=flask)
![Gemini AI](https://img.shields.io/badge/Gemini-2.0-orange?style=for-the-badge&logo=google)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

ClearSight.ai turns raw, unreadable server logs into a plain-English **"Security Storyboard"** using Google Gemini AI — so anyone can understand what's attacking their website.

---

## 🚀 Features

| Feature | Description |
|---|---|
| 📁 **Upload Log Files** | Drag & drop Apache or Nginx `.log` files |
| ⚡ **Instant Threat Detection** | Finds SQL Injection, XSS, Path Traversal, Brute Force & scanners |
| 🤖 **AI-Powered Explanations** | Gemini 2.0 explains attacks in plain English |
| 🎯 **Threat Scorecard** | Spotify Wrapped-style security summary |
| 🛡️ **Instant Fix Generation** | Get exact Cloudflare, iptables, `.htaccess` rules |

---

## 🗂️ Project Structure
clearsight-ai/
├── backend/
│   ├── app.py              # Flask backend + Gemini AI integration
│   ├── requirements.txt    # Python dependencies
│   └── .env                # API keys (DO NOT COMMIT)
├── static/
│   ├── css/
│   └── js/
├── templates/
│   └── index.html          # Frontend UI
├── .gitignore
├── package.json
└── README.md
---

## ⚙️ How to Run

### 1. Clone the repository
```bash
git clone https://github.com/itshaneulharu/EDITH.git
cd EDITH
```

### 2. Install dependencies
```bash
pip install -r backend/requirements.txt
```

### 3. Add your Gemini API Key
Create a `.env` file inside the `backend/` folder:
GOOGLE_API_KEY=your_gemini_api_key_here
Get your free key at → https://aistudio.google.com/app/apikey

### 4. Run the app
```bash
python backend/app.py
```

### 5. Open in browser
http://localhost:5000
---

## 🧪 Demo

Don't have a log file? Click **"⚡ Try With Sample Log"** on the homepage to see ClearSight in action instantly.

---

## 🔐 Threats Detected

- 💉 **SQL Injection** — Database attack attempts
- 🕸️ **XSS (Cross-Site Scripting)** — Script injection
- 📂 **Path Traversal** — Directory snooping (`../../../etc/passwd`)
- 🔨 **Brute Force** — Repeated failed login attempts
- 🤖 **Automated Scanners** — Bots & vulnerability scanners

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, Flask |
| AI | Google Gemini 2.0 |
| Log Parsing | Custom Python Parser |
| Frontend | HTML, CSS, JavaScript |

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

---

## 📄 License

MIT License © 2025 ClearSight.ai
