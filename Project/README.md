# ClearSight.ai

**"We turned a 3-hour security investigation into a 3-second solution — for people who don't even know what a server log is."**

ClearSight turns raw, unreadable server logs into a plain-English "Security Storyboard" using Google Gemini AI. 

## Features
- **Upload Log Files**: Simply drag and drop an Apache or Nginx `.log` file
- **Instant Threat Detection**: Fast local parsing finds SQL injection, XSS, Path Traversal, Brute force, and automated scanners.
- **AI-Powered Explanations**: Gemini 2.0 explains what the attacker tried to do like you're 10 years old.
- **Threat Scorecard**: Get a Spotify Wrapped-style security scorecard for your website.
- **Instant Fix Generation**: Click one button to get exact Cloudflare, iptables, or `.htaccess` rules to stop the attacker.

## How to Run

1. **Install dependencies**
   Make sure you have Python 3.9+ installed.
   ```bash
   pip install -r backend/requirements.txt
   ```

2. **Add your Gemini API Key**
   Create a `.env` file in the `backend` folder and add your key:
   ```
   GOOGLE_API_KEY=your_genai_key_here
   ```
   *(Note: The environment file is already configured in the provided codebase).*

3. **Start the application**
   ```bash
   python backend/app.py
   ```

4. **Open in browser**
   Navigate to `http://localhost:5000`

## Demo
Don't have a log file? Just click the **"⚡ Try With Sample Log"** button on the homepage to see ClearSight in action.
