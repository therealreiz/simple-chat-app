// #region ::: IMPORTS :::
import { createClient } from "@vercel/postgres";
import express, { Request, Response } from "express";
import { config } from "dotenv";
import { Server } from "socket.io";
import { createServer } from "http";
import cors from "cors";
import path from "path";

config();

const PORT = process.env.PORT || 3000;

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const client = createClient({
  connectionString: process.env.DATABASE_URL,
});

client.connect();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
  express.json()
);

io.on("connection", (socket) => {
  socket.on("join_room", (idRoom) => {
    socket.join(idRoom);
  });

  socket.on("message-sent", ({ content, username, idRoom }) => {
    client.query(
      `INSERT INTO messages (content, username, idRoom) VALUES ($1, $2, $3) RETURNING *`,
      [content, username, idRoom],
      (error, res) => {
        if (!error) io.emit("message-received", res.rows[0]);
      }
    );
  });
  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

app.get("/", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/api/rooms", (req: Request, res: Response) => {
  client.query("SELECT * FROM rooms", (error, response) => {
    if (error) res.status(500).json({ error });
    else res.status(200).json(response.rows);
  });
});

app.post("/api/rooms", (req: Request, res: Response) => {
  const { name } = req.body;
  client.query(
    `INSERT INTO rooms (name) VALUES ($1) RETURNING *`,
    [name],
    (error, response) => {
      if (error) res.status(500).json({ error });
      else res.status(200).json(response.rows[0]);
    }
  );
});

app.get("/api/rooms/:idRoom/messages", (req: Request, res: Response) => {
  const { idRoom } = req.params;
  console.log(idRoom);
  client.query(
    `SELECT * FROM messages WHERE idRoom = $1`,
    [idRoom],
    (error, response) => {
      if (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Internal Server Error" });
      } else {
        res.status(200).json(response.rows);
      }
    }
  );
});

app.post("/api/rooms/:idRoom/messages", (req: Request, res: Response) => {
  const { content, username } = req.body;
  const { idRoom } = req.params;
  client.query(
    `INSERT INTO messages (content, username, idRoom) VALUES ($1, $2, $3)`,
    [content, username, idRoom],
    (error) => {
      if (error) res.status(500).json({ error });
      else res.status(200).json({ message: "Message created successfully" });
    }
  );
});

server.listen(PORT, () => {
  console.log(`Server API is running http://localhost:${PORT}`);
});
