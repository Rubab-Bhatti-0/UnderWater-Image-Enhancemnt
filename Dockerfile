FROM node:22-bookworm-slim AS frontend-build
WORKDIR /build

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --include=dev

COPY frontend/index.html frontend/vite.config.js ./
COPY frontend/src ./src
COPY frontend/public ./public
RUN npm run build

FROM python:3.12-slim-bookworm
WORKDIR /app

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/app.py backend/algorithms.py ./backend/
COPY --from=frontend-build /build/dist ./frontend/dist

EXPOSE 10000
CMD ["sh", "-c", "exec waitress-serve --listen=0.0.0.0:${PORT:-10000} --threads=1 --max-request-body-size=16842752 backend.app:app"]