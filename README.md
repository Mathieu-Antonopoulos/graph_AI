# WebLite

**WebLite** is a lightweight, socket-based framework for building local web platforms. It enables fast, minimal, and structured communication between a server and web clients — ideal for embedded tools, internal dashboards, or interactive prototypes.

This lite framework use D3.js for JavaScript manipulation.

---

## Features

- Minimal and modular by design  
- Event-driven communication over sockets  
- Easily extendable for local apps  
- Clean separation of logic and infrastructure  
- Includes a **working demo** for quick onboarding

---

## Quick Start

Install the required dependencies:

```bash
pip install -r requirements.txt
```

## Usage
To run the app locally, open **two terminals**:

**Terminal 1 — Backend:**
```bash
cd backend
python server.py
```
**Terminal 2 — Frontend:**
```bash
cd frontend
python -m http.server
```

Access the frontend via:  
**http://localhost:8000**

The frontend will connect to the backend via sockets (e.g., `ws://localhost:5384` by default).

---

## Project Structure

- `backend/server.py` — main entry point for the backend socket server, example version
- `backend/utils/` — core components like the socket server and message abstractions  

- `frontend/index` — main HTML file for the frontend, example version
- `frontend/js/` — JavaScript files for client-side logic
- `frontend/css/` — stylesheets for the frontend UI

---

## Best Practices

- Keep business logic outside the server class.
- Use named handler functions for clarity and reuse.
- Avoid inline lambdas for anything beyond trivial cases.
- Treat `utils/socket_server.py` and `utils/message.py` as infrastructure — not app logic.

---

## Troubleshooting

**Frontend doesn’t connect to backend:**
- Ensure both terminals are running.
- Check `localhost` usage and port consistency.
- Look at browser console logs for connection errors.
- Verify the frontend uses the correct WebSocket URI.
- Ensure the backend is running (check `server.py` logs).

**Server exits immediately:**
- Make sure `await self.socket.wait()` is used to block the shutdown.
- Check for any unhandled exceptions in the server logs.

**Address already in use:**
- Change the socket port or stop the conflicting process.

<small>
*If you encounter any issues, please open an issue on GitHub.*
</small>

---

## Development Tips

- Enable `_print=True` on `ServerSocket` for live logging.
- Use `asyncio.create_task()` for background async tasks.
- Inspect frontend logs with browser DevTools (F12 > Console).

