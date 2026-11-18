FROM node:22-bookworm-slim AS frontend-build
WORKDIR /build

COPY frontend/ ./
RUN npm ci --include=dev && npm run build

FROM python:3.13-slim-bookworm
WORKDIR /app

COPY requirements.txt ./
RUN python -m pip install --no-cache-dir -r requirements.txt

COPY . .
COPY --from=frontend-build /build/dist ./frontend/dist

EXPOSE 10000
CMD ["sh", "-c", "exec waitress-serve --listen=0.0.0.0:${PORT:-10000} --threads=1 --max-request-body-size=16842752 backend.app:app"]