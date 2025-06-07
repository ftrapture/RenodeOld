const sessions = new Map();
import Renode from "../RenodePlayer.js";

class State {
    setSession(key, value, player = new Renode()) {
        const existingSession = sessions.get(key);
        if (existingSession) {
            return sessions.set(key, {
                ws: value.ws || existingSession.ws,
                renode: existingSession.renode.set(value.guildId, player),
                userId: existingSession.userId
            });
        } else {
            const renode = new Map();
            renode.set(value.guildId, player);
            return sessions.set(key, {
                ws: value.ws,
                renode: renode,
                userId: value.userId
            });
        }
    }

    getSessions() {
        return sessions;
    }

    getSession(key) {
        return sessions.get(key);
    }

    deleteSession(key) {
        return sessions.delete(key);
    }

}

export default State;