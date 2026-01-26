package models

import "time"

type File struct {
	Name        string `json:"name"`
	ContentType string `json:"contentType"`
	Size        int64  `json:"size"`
	Data        string `json:"data"` // base64 encoded
}

type Request struct {
	ID          string              `json:"id"`
	Timestamp   time.Time           `json:"timestamp"`
	Method      string              `json:"method"`
	Path        string              `json:"path"`
	Headers     map[string][]string `json:"headers"`
	Body        string              `json:"body"`
	QueryParams map[string][]string `json:"queryParams"`
	Files       []File              `json:"files,omitempty"`
	FormFields  map[string]string   `json:"formFields,omitempty"`
}
