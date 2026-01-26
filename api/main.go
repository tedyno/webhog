package main

import (
	"log"
	"net/http"
	"strings"

	"github.com/tedyno/webhog/handlers"
	"github.com/tedyno/webhog/storage"
)

func main() {
	// Initialize storage and WebSocket hub
	store := storage.NewMemoryStorage(100)
	hub := handlers.NewWebSocketHub()
	webhookHandler := handlers.NewWebhookHandler(store, hub)

	// CORS middleware
	corsMiddleware := func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "*")

			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			next(w, r)
		}
	}

	// Internal routes (prefixed with underscore)
	http.HandleFunc("/_ws", hub.HandleWebSocket)
	http.HandleFunc("/_api/requests", corsMiddleware(webhookHandler.HandleGetRequests))
	http.HandleFunc("/_api/requests/clear", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" || r.Method == "DELETE" {
			webhookHandler.HandleClearRequests(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))
	http.HandleFunc("/_health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Catch-all webhook handler - any path that doesn't start with underscore
	http.HandleFunc("/", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		// Skip internal routes
		if strings.HasPrefix(r.URL.Path, "/_") {
			http.NotFound(w, r)
			return
		}
		webhookHandler.HandleWebhook(w, r)
	}))

	log.Println("Webhog server starting on :8080")
	log.Println("WebSocket endpoint: ws://localhost:8080/_ws")
	log.Println("Webhook endpoint: http://localhost:8080/*")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal(err)
	}
}
