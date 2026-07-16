# syntax=docker/dockerfile:1

# ---------- build stage: regenerate catalog/exercises/icons + assemble dist/ ----------
FROM node:20-alpine AS build
WORKDIR /app
# No runtime dependencies — the generators use only Node built-ins.
COPY package.json ./
COPY scripts ./scripts
COPY src ./src
COPY data ./data
COPY icons ./icons
COPY index.html styles.css app.js sw.js manifest.webmanifest ./
RUN npm run build

# ---------- serve stage: static site via nginx ----------
FROM nginx:1.27-alpine
LABEL org.opencontainers.image.source="https://github.com/christopherstainberg-oss/physiopath"
LABEL org.opencontainers.image.description="PhysioPath — injury-recovery PWA (10k conditions, 5k exercises)"
LABEL org.opencontainers.image.licenses="MIT"
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
