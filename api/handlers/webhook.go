package handlers

import (
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/tedyno/webhog/models"
	"github.com/tedyno/webhog/storage"
)

var mimeTypes = map[string]string{
	".png":  "image/png",
	".jpg":  "image/jpeg",
	".jpeg": "image/jpeg",
	".gif":  "image/gif",
	".webp": "image/webp",
	".svg":  "image/svg+xml",
	".ico":  "image/x-icon",
	".bmp":  "image/bmp",
	".pdf":  "application/pdf",
	".json": "application/json",
	".xml":  "application/xml",
	".txt":  "text/plain",
	".html": "text/html",
	".css":  "text/css",
	".js":   "application/javascript",
}

func detectContentType(filename string, data []byte, headerContentType string) string {
	// First try header
	if headerContentType != "" && headerContentType != "application/octet-stream" {
		return headerContentType
	}

	// Try by extension
	ext := strings.ToLower(filepath.Ext(filename))
	if mime, ok := mimeTypes[ext]; ok {
		return mime
	}

	// Fallback to http detection
	return http.DetectContentType(data)
}

type WebhookHandler struct {
	storage *storage.MemoryStorage
	hub     *WebSocketHub
}

func NewWebhookHandler(storage *storage.MemoryStorage, hub *WebSocketHub) *WebhookHandler {
	return &WebhookHandler{
		storage: storage,
		hub:     hub,
	}
}

func (h *WebhookHandler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	req := models.Request{
		ID:          uuid.New().String(),
		Timestamp:   time.Now(),
		Method:      r.Method,
		Path:        r.URL.Path,
		Headers:     r.Header,
		QueryParams: r.URL.Query(),
	}

	contentType := r.Header.Get("Content-Type")

	// Check if URL encoded form data
	if strings.HasPrefix(contentType, "application/x-www-form-urlencoded") {
		err := r.ParseForm()
		if err != nil {
			http.Error(w, "Error parsing form", http.StatusBadRequest)
			return
		}

		req.FormFields = make(map[string]string)
		for key, values := range r.PostForm {
			if len(values) > 0 {
				req.FormFields[key] = values[0]
			}
		}
	} else if strings.HasPrefix(contentType, "multipart/form-data") {
		// Parse multipart form (32MB max)
		err := r.ParseMultipartForm(32 << 20)
		if err != nil {
			http.Error(w, "Error parsing multipart form", http.StatusBadRequest)
			return
		}

		// Extract form fields
		if r.MultipartForm != nil && r.MultipartForm.Value != nil {
			req.FormFields = make(map[string]string)
			for key, values := range r.MultipartForm.Value {
				if len(values) > 0 {
					req.FormFields[key] = values[0]
				}
			}
		}

		// Extract files
		if r.MultipartForm != nil && r.MultipartForm.File != nil {
			for _, fileHeaders := range r.MultipartForm.File {
				for _, fileHeader := range fileHeaders {
					file, err := fileHeader.Open()
					if err != nil {
						continue
					}

					data, err := io.ReadAll(file)
					file.Close()
					if err != nil {
						continue
					}

					contentType := detectContentType(
					fileHeader.Filename,
					data,
					fileHeader.Header.Get("Content-Type"),
				)

					req.Files = append(req.Files, models.File{
						Name:        fileHeader.Filename,
						ContentType: contentType,
						Size:        fileHeader.Size,
						Data:        base64.StdEncoding.EncodeToString(data),
					})
				}
			}
		}
	} else {
		// Regular body
		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Error reading body", http.StatusInternalServerError)
			return
		}
		defer r.Body.Close()
		req.Body = string(body)
	}

	// Store request
	h.storage.Add(req)

	// Broadcast to all connected clients
	h.hub.Broadcast(req)

	// Respond OK
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status": "received",
		"id":     req.ID,
	})
}

func (h *WebhookHandler) HandleGetRequests(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(h.storage.GetAll())
}

func (h *WebhookHandler) HandleClearRequests(w http.ResponseWriter, r *http.Request) {
	h.storage.Clear()
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(map[string]string{"status": "cleared"})
}
