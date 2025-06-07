import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import restRoutes from "./server/rest/Routes.js";
import setupWebSocket from "./server/ws/Websocket.js";

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());

// Authorization middleware
app.use((req, res, next) => {
    const auth = req.headers["authorization"];
    if (!auth) {
        return res.status(401).json({ message: "Authorization header is required" });
    }
    next();
});

// CORS middleware
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Session-Id, Client-Name");
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }
    next();
});

// REST routes
app.use("/", restRoutes);

// WebSocket server
const wss = new WebSocketServer({ server, path: "/v4/websocket" });
setupWebSocket(wss);

app.use((err, req, res, next) => {
    console.error("Server error:", err);
    res.status(500).json({
        message: "Internal server error",
        error: process.env.NODE_ENV === "development" ? err.message : undefined
    });
});

//404 routes
app.use((req, res) => {
    res.status(404).json({ message: "Not found" });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

server.listen(PORT, HOST, () => {
    console.log("\n=== RenodePlayer Server ===");
    console.log(`REST API    → http://${HOST}:${PORT}/v4`);
    console.log(`WebSocket   → ws://${HOST}:${PORT}/v4/websocket`);
    console.log("=========================\n");
}); 