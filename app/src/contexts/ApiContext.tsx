"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface ApiContextValue {
  apiUrl: string;
  isLoaded: boolean;
}

const ApiContext = createContext<ApiContextValue>({
  apiUrl: "http://localhost:8080",
  isLoaded: false,
});

export function ApiProvider({ children }: { children: ReactNode }) {
  const [apiUrl, setApiUrl] = useState("http://localhost:8080");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((config) => {
        setApiUrl(config.apiUrl);
        setIsLoaded(true);
      })
      .catch(() => {
        setIsLoaded(true);
      });
  }, []);

  return (
    <ApiContext.Provider value={{ apiUrl, isLoaded }}>
      {children}
    </ApiContext.Provider>
  );
}

export function useApiUrl() {
  return useContext(ApiContext).apiUrl;
}

export function useApiContext() {
  return useContext(ApiContext);
}
