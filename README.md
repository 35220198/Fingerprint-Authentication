# Fingerprint Authentication

A responsive fingerprint register-and-login page built with plain HTML, CSS and JavaScript.
No libraries and no build step.

## How it works

The page picks one of two modes automatically (shown under "Place your finger..."):

| Mode | When | What happens |
|------|------|--------------|
| **Secure mode** | Page opened on `http://localhost` or `https://`, and the device has a fingerprint reader, Windows Hello, Touch ID or similar | Uses the browser's WebAuthn API. Your **real device fingerprint** is checked. The fingerprint itself never reaches the page. |
| **Demo mode** | Opened by double-clicking the file (`file://`), or no biometrics available | A simulated scanner. Fine for showing the interface, but it does not check a real fingerprint. |

Registered users are tagged **device** (secure mode) or **demo**.

## Features

- Animated scanner with "Place your finger..." status
- Register Fingerprint: asks for a name, then scans
- Login with Fingerprint: shows "Authentication Successful! Welcome, name" or a clear failure message
- Registered Users list with a green tick and a remove button
- Users are saved in your browser
- Fits phones, tablets and desktops

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page structure |
| `style.css` | Look and responsive layout |
| `script.js` | Registration, login and scanner logic |
| `README.md` | This guide |

Keep the three code files in the same folder with exactly these names.

## Run it (PowerShell)

```powershell
cd "C:\Users\-admin\Desktop\fingerprint-auth"
python -m http.server 8000
```

Then open <http://localhost:8000> (use `localhost`, not an IP address).
Press `Ctrl + C` in PowerShell to stop the server.

If `python` is not recognised, try `py -m http.server 8000`, or with Node.js: `npx serve .`

## Using it

1. Press **Register Fingerprint**, type your name and continue.
2. Scan your finger (or approve the Windows Hello prompt).
3. Press **Login with Fingerprint** and scan again.
4. In demo mode with several users, tap your name in the list first.

## Windows setup for secure mode

Go to **Settings > Accounts > Sign-in options > Fingerprint recognition (Windows Hello)** and add a fingerprint.
Without a fingerprint reader, Windows may offer your PIN or face instead; that still works.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Says "Demo mode" | Open through `http://localhost:8000` rather than double-clicking the file, and set up Windows Hello. |
| "Cancelled or timed out" | The prompt was closed or took too long. Try again. |
| "Already registered" | That fingerprint is already stored on this device for this page. Remove the old user and register again. |
| Page has no styling | Check `style.css` is in the same folder and not saved as `style.css.txt`. |
| Old version showing | Hard refresh with `Ctrl + F5`. |
| Users vanished | They are saved per browser. Clearing site data or private mode removes them. |

## Important note on security

This is a front-end demo. Users and credentials are stored in the browser and nothing is verified by a server, so it should not protect anything valuable.
A real system must run the WebAuthn challenge and signature check on a server.
