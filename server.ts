import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_WEBHOOK_URL = 'http://137.131.223.126:5678/webhook';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Proxy routes for n8n to avoid Mixed Content (HTTPS -> HTTP) issues
  app.get("/api/n8n/get-users", async (req, res) => {
    try {
      const response = await fetch(`${BASE_WEBHOOK_URL}/get-users`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Proxy error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users from n8n" });
    }
  });

  app.get("/api/n8n/buscaSolicitacoes", async (req, res) => {
    try {
      const response = await fetch(`${BASE_WEBHOOK_URL}/buscaSolicitacoes`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Proxy error fetching absences:", error);
      res.status(500).json({ error: "Failed to fetch absences from n8n" });
    }
  });

  app.post("/api/n8n/validaAusencia", async (req, res) => {
    try {
      const response = await fetch(`${BASE_WEBHOOK_URL}/validaAusencia`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body),
      });
      res.status(response.status).send(response.ok);
    } catch (error) {
      console.error("Proxy error updating absence:", error);
      res.status(500).json({ error: "Failed to update absence in n8n" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
