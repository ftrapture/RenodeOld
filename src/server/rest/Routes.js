import express from "express";
import RenodePlayer from "../../RenodePlayer.js";
import Session from "../state.js";
const sessions = new Session();

const router = express.Router();

let renode = null;

const YOUTUBE_URL_REGEX = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:\S+)?$/;


router.get("/v4/version", (req, res) => {
    res.json({
        version: "4.0.0",
        buildTime: Date.now(),
        commit: "RenodePlayer",
        sourceVersion: "1.0.0"
    });
});

router.get("/v4/loadtracks", async (req, res) => {
    let {
        identifier
    } = req.query;
    let sourceName = "youtube";
    if (!identifier) {
        return res.status(400).json({
            loadType: "error",
            data: {
                message: "Missing 'identifier' query parameter"
            }
        });
    }

    if (typeof identifier === "string") {
        console.log(identifier);

        if (identifier.includes("local:")) {
            sourceName = "local";
            identifier = identifier.split("local:")[1];
        } else if (identifier.includes("ytsearch:") || YOUTUBE_URL_REGEX.test(identifier)) {
            sourceName = "youtube";

            // Only split if it's a ytsearch, not a full YouTube link
            if (identifier.startsWith("ytsearch:")) {
                identifier = identifier.split("ytsearch:")[1];
            }
        } else {
            sourceName = "http";
        }
    } else {
        console.error("Invalid identifier:", identifier);
        sourceName = "http";
    }


    try {
        renode = new RenodePlayer();
        const searchResult = await renode.search(identifier, {
            sourceName
        });
        res.json(searchResult);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            loadType: "error",
            data: {
                message: error.message || "An error occurred while loading tracks",
                severity: "COMMON",
                cause: error.stack
            }
        });
    }
});


router.patch("/v4/sessions/:sessionId/players/:guildId", async (req, res) => {
    const {
        sessionId,
        guildId
    } = req.params;
    const {
        track,
        volume,
        position,
        voice
    } = req.body;
    try {
        if (voice && voice.token && voice.endpoint) {
            let session = sessions.getSession(sessionId);
            if (!session) {
                res.status(500).json({
                    message: "session Id not found"
                });
                return;
            }
            let player = session.renode.get(guildId);
            if (!player) {
                player = new RenodePlayer();
                player.on("playerStateChange", (oS, nS) => {
                    if (nS.status === "playing") {
                        session.ws.send(JSON.stringify({
                            op: "event",
                            type: "TrackStartEvent",
                            guildId: guildId,
                            track: player.musicPlayer.track
                        }));
                    }

                    if (nS.status === "idle" && nS.reason === "ended") {
                        session.ws.send(JSON.stringify({
                            op: "event",
                            type: "TrackEndEvent",
                            guildId: guildId,
                            track: player.musicPlayer.track,
                            reason: "finished"
                        }));
                    }
                });

                await player.init({
                    guildId: guildId,
                    userId: session.userId
                });

                sessions.setSession(sessionId, {
                    ws: session.ws,
                    renode: session.renode,
                    guildId: guildId,
                    userId: session.userId
                }, player);
            }

            session = sessions.getSession(sessionId);
            player = session.renode.get(guildId);
            if (player) {
                await player.sendData({
                    token: voice.token,
                    endpoint: voice.endpoint,
                    sessionId: voice.sessionId
                });
            }
        }

        const session = sessions.getSession(sessionId);
        const player = session.renode.get(guildId);
        if (player) {
            if (track) {
                if (!track.encoded) {
                    player.stop("ended");
                } else {
                    await player.play(track.encoded);
                }
            }

            if (typeof position === 'number') {
                await player.seek(position);
            }

            if (typeof volume === 'number') {
                await player.setVolume(volume);
            }
        }

        res.json({
            guildId,
            track: track?.encoded || null
        });
    } catch (error) {
        console.error('Player error:', error);
        res.status(500).json({
            message: error.message,
            stack: error.stack
        });
    }
});

router.delete("/v4/sessions/:sessionId/players/:guildId", async (req, res) => {
    const {
        sessionId,
        guildId
    } = req.params;

    res.status(204).send();
});

router.get("/v4/sessions/:sessionId/players/:guildId", (req, res) => {
    const {
        sessionId,
        guildId
    } = req.params;

    res.json({
        guildId,
        track: renode.musicPlayer?.track,
        volume: renode.volume,
        position: renode.musicPlayer?.position || 0,
        state: renode.playerState.status
    });
});

export default router;