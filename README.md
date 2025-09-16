<p align="center">
  <img src="static/logo.png" alt="InuSoft Logo" width="200"/>
</p>

InuSoft AIO is a **multi-platform video downloader website** built with **Flask (Python)** as the backend framework and **yt-dlp** as the client downloader engine.  
It supports downloading videos from popular platforms like TikTok, Instagram, Facebook, YouTube, and more.

---

## 🚀 Features
- Built with **Flask (Python 3.9+)**
- Powered by **yt-dlp** for high-quality video & audio downloading
- Simple and clean **web interface**
- Cloudflare Tunnel ready (for easy deployment with custom domains)
- Supports multiple platforms (TikTok, Instagram, Facebook, YouTube, etc.)

---

## 📂 Project Structure

```
.
├── Dockerfile
├── app.py
├── cookies.txt
├── requirements.txt
├── start.sh
├── tunnel.log
├── static/
│   ├── app.js
│   └── logo.png
└── templates/
    ├── index.html
    ├── index.html.bak
    └── tos-privacy.html
```

---

## 🔧 Requirements

- **Python 3.9+** is required
- Install dependencies using:

```bash
pip install -r requirements.txt
```

---

## ▶️ Running the Project

Start the Flask server locally:

```bash
python3 app.py
```

Or using the startup script:

```bash
bash start.sh
```

The application will run on:

```
http://localhost:5000
```

---

## 🌍 Deployment with Cloudflare Tunnel

If you want to expose the app to the internet via **Cloudflare Tunnel**, run:

```bash
nohup ./cf --credentials-file ./<your-tunnel-id>.json tunnel run aio-inusoft --url http://localhost:3014 > tunnel.log 2>&1 &
```

---

## 📜 License
This project is created for **educational and personal use**.  
All responsibility for external usage belongs to the user.
