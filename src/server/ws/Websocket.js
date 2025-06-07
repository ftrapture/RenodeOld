import Session from "../state.js";
import os from "os";
import { randomUUID } from 'crypto';

const sessions = new Session();

export function generateSessionId() {
    return randomUUID();
}

export default function setupWebSocket(wss) {
    wss.on("connection", (ws, req) => {
        const auth = req.headers["authorization"];
        const userId = req.headers["user-id"];
        const clientName = req.headers["client-name"];

        if (auth !== "youshallnotpass") {
            ws.close(4001, "Unauthorized");
            return;
        }

        if (!userId || !clientName) {
            ws.close(4002, "Missing required headers: user-id, client-name");
            return;
        }

        const sessionId = generateSessionId();
         
        sessions.setSession(sessionId, {
            ws,
            renode: new Map(),
            guildId: "id",
            userId
        });

        console.log(`WebSocket connected: ${clientName} (User: ${userId})`);

        // Handle incoming messages
        ws.on("message", (msg) => {
            try {
                const data = JSON.parse(msg);
                const session = sessions.getSession(sessionId);
                
                if (!session) {
                    ws.close(4004, "Session not found");
                    return;
                }

                // Handle different op codes
                switch (data.op) {
                    case "playerUpdate":
                        if (data.guildId && session.renode.has(data.guildId)) {
                            const player = session.renode.get(data.guildId);
                            // Handle player update for specific guild
                            if (player) {
                                // Update player state if needed
                            }
                        }
                        break;
                    
                    case "stats":
                        // Calculate total players and playing players across all guilds
                        const totalPlayers = session.renode.size;
                        const playingPlayers = Array.from(session.renode.values())
                            .filter(p => p.playerState?.status === "playing").length;

                        ws.send(JSON.stringify({
                            op: "stats",
                            players: totalPlayers,
                            playingPlayers: playingPlayers,
                            uptime: process.uptime() * 1000,
                            memory: process.memoryUsage(),
                            cpu: {
                                cores: os.cpus().length,
                                systemLoad: os.loadavg()[0],
                                lavalinkLoad: 0
                            },
                            frameStats: {
                                sent: 0,
                                nulled: 0,
                                deficit: 0
                            }
                        }));
                        break;

                    default:
                        console.log(`Unhandled op code from ${clientName}:`, data.op);
                }
            } catch (error) {
                console.error("Error processing WebSocket message:", error);
            }
        });
        
        ws.send(JSON.stringify({
                op: "ready",
                resumed: false,
                userId: userId,
                sessionId
        }));


        // Handle disconnection
        ws.on("close", () => {
            console.log(`WebSocket disconnected: ${clientName} (User: ${userId})`);
            
            const session = sessions.getSession(userId);
            if (session) {
                // Stop all players for this session
                for (const [guildId, player] of session.renode.entries()) {
                    if (player && player.stop) {
                        player.stop();
                    }
                }
                session.ws = null; // Remove WebSocket reference but keep session
            }
        });
    });
}