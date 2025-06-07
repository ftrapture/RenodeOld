import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import restRoutes from "./rest/Routes.js"; 
import setupWebSocket from "./ws/Websocket.js";
const userSessions = new Map();

const app = express();
const server = http.createServer(app);

app.use(express.json());

app.use((req, res, next) => {
    const auth = req.headers["authorization"];
    if (auth !== "youshallnotpass") {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
});

app.use("/", restRoutes);

const wss = new WebSocketServer({ server, path: "/v4/websocket" });

setupWebSocket(wss);

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`REST API → http://localhost:${PORT}/v4`);
    console.log(`WebSocket  → ws://localhost:${PORT}/v4/websocket`);
});
