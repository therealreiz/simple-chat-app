// #region ::: IMPORTS :::
import express, { request, Request, response, Response } from "express";
import { createClient } from "@vercel/postgres";
import { config } from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
// #endregion

// #region ::: CONFIGURATIONS :::
config(); // carica le variabili d'ambiente

const app = express();
const port = process.env.PORT || 3000;
const server = createServer(app);
const client = createClient({
  connectionString: process.env.POSTGRES_URL,
});
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
); // middleware per il parsing del JSON
// #endregion

// Connect to the database
(async () => {
  try {
    await client.connect();
    console.log("Connected to the database");
  } catch (error) {
    console.error("Failed to connect to the database", error);
  }
})();

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("message-sent", (msg) => {
    client.query("INSERT INTO messages (content) VALUES ($1)", [msg], (err) => {
      if (!err) io.emit("message-received", msg);
    });
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

// Define routes

app.get("/", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/api/messages", async (req: Request, res: Response) => {
  // restituisce tutti i messaggi
  try {
    const response = await client.query("SELECT * FROM messages");
    return res.status(200).json(response.rows);
  } catch (error) {
    return res.status(500).json({ message: "connection error", error });
  }
});

app.post("/api/messages", async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    await client.query("INSERT INTO messages (content) VALUES ($1)", [content]);
    return res.status(200).json({ message: "message created" });
  } catch (error) {
    return res.status(500).json({ message: "connection error", error });
  }
});

// Start the server
server.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});
