package storage

import (
	"sync"

	"github.com/tedyno/webhog/models"
)

type MemoryStorage struct {
	mu       sync.RWMutex
	requests []models.Request
	maxSize  int
}

func NewMemoryStorage(maxSize int) *MemoryStorage {
	return &MemoryStorage{
		requests: make([]models.Request, 0),
		maxSize:  maxSize,
	}
}

func (s *MemoryStorage) Add(req models.Request) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Přidáme na začátek (nejnovější první)
	s.requests = append([]models.Request{req}, s.requests...)

	// Omezíme velikost
	if len(s.requests) > s.maxSize {
		s.requests = s.requests[:s.maxSize]
	}
}

func (s *MemoryStorage) GetAll() []models.Request {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]models.Request, len(s.requests))
	copy(result, s.requests)
	return result
}

func (s *MemoryStorage) Clear() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.requests = make([]models.Request, 0)
}
