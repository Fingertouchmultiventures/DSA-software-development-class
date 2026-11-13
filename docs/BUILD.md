# Build and deploy

There is **no build step** for the app: everything in `app/` is served as is.

## Requirements
- Node.js 18+ and FFmpeg in PATH (relay machine; Windows laptop in church)
- A Firebase Realtime Database with Email/Password Authentication enabled and the secured rules in `firebase.database.rules.json` published; its URL goes in `app/config.js` (`databaseURL`, `defaultRoom`, `facebookPageUrl`)
- A Facebook Live stream key (typed in the control room; never committed)
- For the public watch stream: Cloudflare's free `cloudflared` (downloaded by `relay\public-link.bat`) or a cloud host for the relay

## Run locally
```
cd relay
start.bat                 # Windows; or: node server.js
start-lan.bat             # church-network mode, no internet needed for cameras
public-link.bat           # second window: public https address for the watch stream
webm-to-mp4.bat           # drag a .webm onto it -> MP4 next to it
open-control-room.bat     # opens http://localhost:8787/control.html
```
Open `http://localhost:8787/control.html`. Environment variables: `PORT` (8787), `HOST`, `ALLOW_ORIGINS` (comma list), `TOKEN` (shared password, needed when the relay is public), `LAN=1`, `LAN_PORT`. Extra allowed web addresses go one per line in `relay/my-addresses.txt` (see the `.example`).

## Relay routes
| Route | Purpose |
|---|---|
| WebSocket `/` | stream (`cmd:start` with `server`, `key`, `hls`, `bitrate`) and `?mode=record` sessions |
| WebSocket `/sig` | LAN signalling for phones/TV |
| `POST /convert` | webm → seekable MP4 (CFR 30 fps, AAC) |
| `GET /live/index.m3u8`, `/live/segNNNNN.ts` | public HLS stream |
| `/relay-status`, `/lan-info` | health and church-network addresses |

## Deploy the app
- **Vercel**: push to `main`; project `lcrm-control-room` deploys automatically.
- **Cloudflare Worker** (`lcrm-control-room`, sites `*.o2affairssolution.workers.dev` / `*.loveofchrist.workers.dev`): re-upload the `app` folder manually after each change.
- On every release bump `CACHE` in `app/sw.js` (currently `lcrm-v16`) and add new files to `SHELL`, so devices pick up the update (reload once).

## Update the relay on the laptop
Run `relay\update-relay.bat`, or download the repo ZIP and replace `relay\` (keep `my-addresses.txt`, `recordings\`, `cloudflared.exe`). Old relays have no `/convert`, no `/live`, no public stream.

## Cloud relay (more viewers)
Build `relay/Dockerfile` (Node + FFmpeg) on any container host. Set `ALLOW_ORIGINS` and a `TOKEN`; enter its https address in the control room (relay address with the token, and "Public address of this relay"). Bandwidth is then the host's, not the church's upload.

## Testing
Run the automated unit and browser tests with Node.js:
```
npm test
```
The suite uses mocked Firebase Auth and a local relay, so it does not need live Firebase credentials or FFmpeg. Publish and verify the database rules in the Firebase Console separately; Facebook delivery, physical phones, HLS playback, and Windows `.bat` files also need manual/device testing before relying on them.

## Troubleshooting pointers
- *Cannot reach the relay / Blocked connection from origin*: open the control room from `http://localhost:8787/...`, or add the address to `my-addresses.txt`, then restart the relay (see SETUP.md).
- *`public-link.bat` download 504*: GitHub is busy; it retries 4 times. Else download `cloudflared-windows-amd64.exe` in a browser, rename to `cloudflared.exe`, place it in `relay\`.
- *Watch page still shows Facebook while live*: check `https://<tunnel>/live/index.m3u8` shows `#EXTM3U`, that "Public watch stream" is ticked and the address is pasted.

## Conventions
Commits end with the `Co-Authored-By` and `Claude-Session` trailers. Do not commit stream keys, `relay/recordings/`, `relay/live/` or `cloudflared.exe`.
