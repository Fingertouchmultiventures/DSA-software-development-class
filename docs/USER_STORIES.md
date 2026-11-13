# User stories

Roles: **Operator** (control room), **Camera handler** (phone), **Media team** (Photo Studio), **Viewer** (anyone watching), **Admin** (sets up the system).

## Streaming
- As an operator, I want to go live to Facebook from the control room so the service reaches online members.
- As an operator, I want the stream to reconnect by itself after Facebook drops it so I do not restart mid-service.
- As an operator, I want to switch cameras with fade, cut and other transitions so the show looks professional.
- As an operator, I want to show hymns, lyrics, scripture, slides, media, a scrolling message and an offering card without separate software.
- As an operator, I want to stream only to the public page when I have no Facebook key, or when Facebook fails.

## Viewers
- As a member at home, I want one link that shows the church TV picture without Facebook and without the church Wi-Fi.
- As a viewer on a phone, I want the picture to start by itself and to tap once for sound.
- As a viewer when the service is not live, I want the page to show the church Facebook page and latest videos instead of an error.
- As a member, I want to share the watch link by WhatsApp.

## Camera handlers
- As a handler, I want a clear ON AIR cue when my camera is live so I can adjust my framing.
- As a handler, I want the operator to ping me with instructions so we need no side chat.
- As a handler, I want my phone camera to keep working with the screen locked or the app in the background as far as the OS allows.
- As a handler, I want a flash cue when a photo is taken from my phone.

## Recording
- As an operator, I want an offline recording with sound that I can upload later, so a failed stream is not a lost service.
- As an operator, I want recordings as real MP4 files I can scrub and forward, and a way to convert an old .webm.

## Photos and video
- As an operator, I want full-resolution, steady photos on shutter, not blurry or low quality.
- As the media team, I want photos auto-edited in a Canon, iPhone or Nikon style so I can post quickly.
- As the media team, I want dark, noisy or soft photos rescued automatically so I can upload them without manual editing.
- As the media team, I want church frames, backgrounds, blur and elements applied in batch, then exported as a ZIP.
- As an operator, I want photos taken in the control room to land in Photo Studio automatically.
- As the media team, I want a full Photo Lab (curves, retouch, crop) for important photos.
- As the media team, I want a Video Lab to cut the service recording into clips with captions for posting.
- As the media team, I want a Copilot I can type to ("brighten it and make it black and white") instead of finding tools.

## Setup and reliability
- As an admin, I want my setup saved once and loaded on every phone, laptop and browser so I never reconfigure each device.
- As an admin, I want a one-time setup guide with clear error help (relay unreachable, blocked origin, Firebase timeout, tunnel download failure).
- As an admin, I want the system to work on the church network without internet.
- As an admin, I want to install the app on phones and laptop.
- As an admin, I want the stream key and relay password to stay on one device and never be shared.

## Not yet done / ideas
- Verify public-stream playback with real viewers; add a bigger-audience path (cloud relay / CDN) as a documented one-click setup
- Stable (named) tunnel address so the link never changes
- Native Android app (or PWABuilder package)
- Reliable horizon straightening in Photo Studio
- AI help assistant (code present, not wired in)
