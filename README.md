# Webhog

Real-time HTTP request inspector. Capture and inspect HTTP requests instantly.

## Use Cases

- **API debugging** - Inspect what your application is actually sending
- **Integration testing** - Verify request format before connecting to real endpoints
- **Local development** - Quick endpoint for testing HTTP clients

## Features

- Real-time request streaming via WebSocket
- Support for all HTTP methods (GET, POST, PUT, PATCH, DELETE)
- Pretty formatting for JSON, GraphQL, and XML bodies
- File upload support with image preview
- Form data parsing (multipart and URL-encoded)
- Copy cURL command for easy replay

## Quick Start

### Using Docker Compose (recommended)

```bash
docker compose up
```

### Manual Setup

```bash
# Terminal 1: Start backend
cd api && go run .

# Terminal 2: Start frontend
cd app && npm install && npm run dev
```

### Access

- **Frontend**: http://localhost:3000
- **Inspect endpoint**: http://localhost:8080/*

## Usage

Send any HTTP request to `http://localhost:8080/<any-path>`:

```bash
# JSON
curl -X POST http://localhost:8080/test \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello World"}'

# GraphQL
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ users { id name } }", "variables": {"limit": 10}}'

# XML
curl -X POST http://localhost:8080/xml \
  -H "Content-Type: application/xml" \
  -d '<?xml version="1.0"?><root><message>Hello</message></root>'

# Form data
curl -X POST http://localhost:8080/form \
  -d "username=john&password=secret"

# File upload
curl -X POST http://localhost:8080/upload \
  -F "file=@image.png"
```

## Architecture

```
webhog/
├── api/                    # Go backend (port 8080)
│   ├── main.go
│   ├── handlers/
│   ├── storage/
│   └── models/
├── app/                    # Next.js frontend (port 3000)
│   └── src/
├── Dockerfile
└── docker-compose.yml
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `* /*` | Request capture (any method, any path) |
| `GET /_ws` | WebSocket for real-time updates |
| `GET /_api/requests` | Get all stored requests |
| `POST /_api/requests/clear` | Clear request history |
| `GET /_health` | Health check |

Internal endpoints use `_` prefix to avoid conflicts.

## License

MIT
