# LCRM Control Room

A church media "control room" that runs in the browser. Phones and webcams become cameras. One operator mixes them with slides, hymns, lyrics, scripture, media and a scrolling message. The result goes to **Facebook Live**, to the **church TV**, and to a **public watch page** that needs no Facebook. A built-in **Photo Studio** (with **Photo Lab**, **Video Lab** and **Copilot**) edits photos and recordings after the service.

It is not OBS. It is a static web app (no build step) plus a small Node relay that hands the video to FFmpeg.

## Pages
| Page | Who uses it | What it does |
|---|---|---|
| `index.html` | everyone | Launcher; install as an app |
| `control.html` | operator (laptop) | Cameras, program/preview, transitions, overlays, go live, record, photos, pings, public watch settings |
| `cam.html` | camera handler (phone) | Sends the camera to the control room; ON AIR cue, pings, shutter |
| `tv.html` | church TV | Shows the program output (connects directly to the laptop, so same-network use) |
| `watch.html` | **the public** | One link for anyone, anywhere: church TV picture (no Facebook) or the Facebook live video / page |
| `studio.html` | media team | Photo Studio: batch auto-edit, rescue, backgrounds, elements, frame, ZIP. Opens **Photo Lab**, **Video Lab** and **Copilot** |

## Quick start
1. Put the `app` folder online (Vercel, Cloudflare Workers, any static host) or open it from the relay.
2. On the church laptop run `relay\start.bat` (needs Node 18+ and `ffmpeg` in PATH).
3. Open `http://localhost:8787/control.html`, paste the Facebook stream key, click **Start Facebook Live**.
4. Phones open `cam.html`, enter the room code (`lcrmchurch`) and allow the camera.
5. For people outside the church: run `relay\public-link.bat`, paste its address in **Connect phones**, tick **Public watch stream**, and share the **Watch link**.

Full walkthrough: [SETUP.md](SETUP.md). More: [Architecture](docs/ARCHITECTURE.md) · [User stories](docs/USER_STORIES.md) · [Build and deploy](docs/BUILD.md).

## Highlights
**Live**
- Phone and webcam cameras over WebRTC with ON AIR cues, pings, flash on photo and background keep-alive
- Fade, cut and many other transitions
- Auto-reconnect to Facebook after TLS drops (error -10053) with the same stream key
- **Public watch stream**: HLS from the relay, viewable by anyone without Facebook (via `public-link.bat` or a cloud relay)
- Works on the church network without internet (LAN mode)

**Recording**
- Records MP4 directly where the browser can; through the relay it is a constant-30 fps MP4 with synced sound
- **Convert .webm → MP4** (control room, Photo Studio, or drag onto `relay\webm-to-mp4.bat`) so recordings can be scrubbed and forwarded

**Photos and video**
- Full-resolution photos with steady-shot; automatic hand-off to Photo Studio
- Photo Studio: Canon / iPhone / Nikon looks, rescue for dark, noisy or soft photos, backgrounds, elements, church frame, ZIP export
- Photo Lab (curves, retouch, crop), Video Lab (timeline, captions, effects) and a Copilot you type to

**Everywhere**
- **Memory point**: your setup is saved once and every device that opens the app loads it (never the stream key or relay password)
- Firebase-backed control, camera, TV and Studio devices sign in with the shared church account; the public watch page remains read-only and open to viewers
- Installable PWA; animated UI that respects "reduce motion"

## Known limits
- Facebook may take a while to pick up a new stream; keep the key unchanged and wait.
- Phone cameras are throttled by the OS when the screen is off; keep them on and plugged in.
- The public watch stream is served from the laptop's upload: about 0.9 Mbit/s per viewer (10 Mbit/s upload ≈ 8 viewers). Use a cloud relay for more. The free tunnel address changes every run.
- `tv.html` is for the church TV only; it is not a public viewer.
- Heavy motion blur in photos cannot be truly recovered. "Straighten crooked photos" is experimental and off by default.
- Smart background cutout downloads a model from a CDN on first use and is untested with the real model.
- Not yet verified on real devices: public stream playback on phones, `update-relay.bat`, `webm-to-mp4.bat`, Facebook comments chat, long video exports, Copilot with a Claude key.
- Never share or commit a Facebook stream key; reset it if it was exposed.
