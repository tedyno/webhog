# Stage 1: Build Go API
FROM golang:1.21-alpine AS api-builder

WORKDIR /build

COPY api/go.mod api/go.sum ./
RUN go mod download

COPY api/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o webhog .

# Stage 2: Build Next.js App
FROM node:22-alpine AS app-builder

WORKDIR /build

COPY app/package.json app/package-lock.json* ./
RUN npm ci

COPY app/ ./
RUN npm run build

# Stage 3: Final image
FROM node:22-alpine

WORKDIR /app

# Install supervisor for running multiple processes
RUN apk add --no-cache supervisor

# Copy Go binary
COPY --from=api-builder /build/webhog /app/webhog

# Copy Next.js standalone build
COPY --from=app-builder /build/.next/standalone ./frontend/
COPY --from=app-builder /build/.next/static ./frontend/.next/static
COPY --from=app-builder /build/public ./frontend/public

# Create supervisor config
RUN mkdir -p /etc/supervisor.d
COPY <<EOF /etc/supervisor.d/webhog.ini
[supervisord]
nodaemon=true
logfile=/dev/stdout
logfile_maxbytes=0

[program:api]
command=/app/webhog
directory=/app
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:frontend]
command=node server.js
directory=/app/frontend
environment=PORT=3000,HOSTNAME=0.0.0.0
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
EOF

EXPOSE 8080 3000

CMD ["supervisord", "-c", "/etc/supervisor.d/webhog.ini"]
