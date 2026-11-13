# LCRM cloud relay: runs the same relay + FFmpeg on an internet server instead of your laptop.
FROM node:20-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /srv
COPY relay/server.js relay/
COPY app/ app/
ENV HOST=0.0.0.0 PORT=8787
# set TOKEN (a shared password) and ALLOW_ORIGINS (your control-room web address) in the host's settings
EXPOSE 8787
CMD ["node", "relay/server.js"]
