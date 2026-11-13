# Architecture

```
 Phones (cam.html) ──WebRTC──▶ Control room (control.html, laptop browser)
      ▲  data channel: ping / tally / shoot            │ canvas mix + Web Audio mix
      │                                                │ MediaRecorder (webm chunks)
      └──── Firebase RTDB (signalling + shared setup)  ▼ WebSocket
 TV (tv.html) ◀── program ───────────────        Relay (Node, relay/server.js)
                                                       │ stdin
                                                       ▼
                                      FFmpeg ─┬─ RTMPS ──▶ Facebook Live        (full quality)
                                              ├─ HLS 480p ▶ relay/live/ ──▶ /live/index.m3u8 ──▶ tunnel/cloud ──▶ watch.html (public)
                                              └─ MP4      ▶ relay/recordings/   (record mode)
```

## Components
- **Static app (`app/`)**: plain HTML/CSS/JS, no bundler. Service worker `sw.js` (network-first, cache `lcrm-v16`) makes it installable and offline-tolerant.
- **Signalling (`signal.js`)**: Firebase Realtime Database (`lcrm-control-room-default-rtdb`, room `lcrmchurch`) introduces peers. Church devices sign in with the shared Email/Password account; database rules allow unauthenticated read-only access only to the public watch state. No video passes through Firebase. In LAN mode the same API is served by the relay's `/sig` without internet.
- **Media (`control.js`, `cam.js`)**: WebRTC from each camera; the control room composites cameras, slides, lyrics, logos and transitions on a canvas and mixes audio with Web Audio.
- **Relay (`relay/server.js`)**: dependency-free Node server. Serves `app/`, accepts the composited stream over WebSocket and starts FFmpeg. Routes: WebSocket `/` (stream and record sessions), `/sig` (LAN signalling), `/convert` (POST webm → MP4), `/live/*` (public HLS), `/lan-info`, `/relay-status`. Enforces `ALLOW_ORIGINS` + `my-addresses.txt`; optional `TOKEN`.
- **Reconnect**: when Facebook drops the TLS link (-10053) `control.js` restarts FFmpeg with the same key and keeps the operator's "live" intent.
- **Recording**: relay mode writes webm and converts to constant-30 fps MP4 with AAC. Without the relay the browser records MP4 directly when supported (else webm, convertible with `/convert` or `webm-to-mp4.bat`).
- **Public watch stream**: start with `hls:true` runs a second 480p encode to `relay/live/` (2 s segments), beside or instead of the Facebook output. The control room publishes its URL to `rooms/<room>_public/hls`; `watch.html` plays it (hls.js, native on iOS) and falls back to the pasted Facebook live-video embed or the Facebook page plugin. Through a tunnel or cloud proxy only `/live/*` is reachable unless a `TOKEN` is set.
- **Photos**: cameras use `ImageCapture.takePhoto` at max resolution after a steady-shot wait; the control room fires the shutter over the data channel. Photos go to the IndexedDB inbox `studioInbox:*` (+ `BroadcastChannel`).
- **Photo Studio (`studio.js`, `enhance.js`, `bg.js`, `frame.js`)**: on-device canvas pipeline: analysis (brightness, blur, noise) → adaptive rescue → look (canon, portrait, vivid, stage, warm, film, bw, iphone, nikon) → optional background (blur, MediaPipe cutout, procedural backdrops), elements, frame → JPEG/ZIP.
- **Labs (`app/labs/`)**: Photo Lab, Video Lab and Copilot adapted from Haven's Studio (its design editor and graphics are not included). `studio.html` shows `labs/labs.html` in a full-screen dialog (iframe) and talks to it by `postMessage` (`labs-bridge.js`); the Copilot (`labs-copilot.js`, `lab-ai.js`) runs an offline interpreter with an optional user Claude key. Recordings kept in memory arrive via `videoInbox:*`.
- **Memory point (`sync.js`)**: hooks `localStorage` writes of shared keys and stores `{v,t,by}` per key under `rooms/<room>_memory/<key>`. Newer remote values are applied; device-only fields (stream key, relay URL, token) are never uploaded and are kept locally. A freshly opened page reloads once to apply; while streaming or recording only a "Refresh" bar appears.
- **Converter (`convert.js`)**: sends a webm to the relay `/convert` and downloads the MP4 (allowed origins only; blocked on the LAN address).
- **UI motion (`anim.css`)**: transform/opacity animations on all pages, off under `prefers-reduced-motion`.

## Data and privacy
| Data | Where | Shared? |
|---|---|---|
| WebRTC offers/answers | Firebase `rooms/<room>` | transient |
| Setup (look, words, songs, plan, frame, labels) | Firebase `rooms/<room>_memory` | yes, all devices |
| Public stream / Facebook link | Firebase `rooms/<room>_public` | yes, public |
| Stream key, relay password, relay URL | `localStorage` of one device | never |
| Photos, recordings | device / relay `recordings/` | never uploaded |

Firebase rules allow authenticated church devices to read/write `rooms`; only `rooms/<room>_public` is readable without signing in, and no unauthenticated writes are allowed. Never put stream keys or relay passwords in shared data.

## Hosting
| Part | Where |
|---|---|
| `app/` | Vercel (auto-deploy from `main`), Cloudflare Worker `lcrm-control-room` (manual upload), or the relay |
| Relay + FFmpeg | Church laptop (`start.bat`); a container (`relay/Dockerfile`) for a cloud relay |
| Public address of the laptop relay | Cloudflare quick tunnel via `relay/public-link.bat` |
| Signalling and shared setup | Firebase RTDB |

Vercel cannot run FFmpeg or hold WebSockets, so it only hosts the static app.

## Security
- Relay accepts only allowed origins; a token is required when it is publicly reachable.
- Requests that arrive through a proxy/tunnel (Cloudflare headers) can only read `/live/*` unless a token is set.
- The converter and Facebook streaming are not offered on the LAN address.
- The Facebook key is entered at run time and never stored in the repo or shared.
