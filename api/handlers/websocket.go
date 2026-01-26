package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/tedyno/webhog/models"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Povolíme všechny origins pro development
	},
}

type WebSocketHub struct {
	mu      sync.RWMutex
	clients map[*websocket.Conn]bool
}

func NewWebSocketHub() *WebSocketHub {
	return &WebSocketHub{
		clients: make(map[*websocket.Conn]bool),
	}
}

func (h *WebSocketHub) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	h.mu.Lock()
	h.clients[conn] = true
	h.mu.Unlock()

	log.Printf("WebSocket client connected. Total clients: %d", len(h.clients))

	defer func() {
		h.mu.Lock()
		delete(h.clients, conn)
		h.mu.Unlock()
		conn.Close()
		log.Printf("WebSocket client disconnected. Total clients: %d", len(h.clients))
	}()

	// Čteme zprávy (pro udržení spojení a detekci odpojení)
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

func (h *WebSocketHub) Broadcast(req models.Request) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	data, err := json.Marshal(req)
	if err != nil {
		log.Printf("Error marshaling request: %v", err)
		return
	}

	for conn := range h.clients {
		err := conn.WriteMessage(websocket.TextMessage, data)
		if err != nil {
			log.Printf("Error broadcasting to client: %v", err)
		}
	}
}
