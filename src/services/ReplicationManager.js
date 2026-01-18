const net = require('net');

/**
 * ReplicationManager - Manages Replication (CABANG) for SawitDB
 * Handles PRIMARY (Master) and REPLICA (Slave) roles via CDC.
 */
class ReplicationManager {
    constructor(engine) {
        this.engine = engine;
        this.role = 'STANDALONE'; // STANDALONE | PRIMARY | REPLICA
        this.replicas = new Set(); // For Primary: Connected replica sockets
        this.primarySocket = null; // For Replica: Connection to primary
    }

    /**
     * Configure Replication Role
     * SETEL CABANG SEBAGAI [role] ...
     */
    configure(role, host = null, port = null) {
        role = role.toUpperCase();

        if (role === 'PRIMARY' || role === 'PUSAT') {
            this.role = 'PRIMARY';
            this._enableCDC();
            return `Server configured as PRIMARY. Listening for replicas...`;

        } else if (role === 'REPLICA' || role === 'CABANG') {
            if (!host || !port) throw new Error("Replica requires Host and Port of Primary.");

            this.role = 'REPLICA';
            this._connectToPrimary(host, port);
            return `Server configured as REPLICA. Connecting to ${host}:${port}...`;

        } else {
            this.role = 'STANDALONE';
            return `Server replication disabled (STANDALONE).`;
        }
    }

    _enableCDC() {
        // Ensure DB Event is enabled for broadcasting
        // This hooks into DBEventHandler via WowoEngine
        if (this.engine.dbevent) {
            // Subscribe to all events to broadcast them
            this.engine.dbevent.on('ANY', (event) => {
                this.broadcastEvent(event);
            });
            console.log("[Replication] CDC Broadcasting enabled.");
        }
    }

    _connectToPrimary(host, port) {
        if (this.primarySocket) this.primarySocket.destroy();

        const client = new net.Socket();
        client.connect(port, host, () => {
            console.log(`[Replication] Connected to Primary at ${host}:${port}`);
            // Handshake / Auth could go here
            client.write(JSON.stringify({ type: 'REPLICATION_HANDSHAKE', secret: 'sawit-secret' }) + '\n');
        });

        client.on('data', (data) => {
            // Validate and Apply Event
            try {
                const event = JSON.parse(data.toString());
                this._applyReplicationEvent(event);
            } catch (e) {
                console.error("[Replication] Failed to process event:", e.message);
            }
        });

        client.on('error', (err) => console.error("[Replication] Connection error:", err.message));

        this.primarySocket = client;
    }

    broadcastEvent(event) {
        if (this.role !== 'PRIMARY') return;
        if (this.replicas.size === 0) return;

        const payload = JSON.stringify(event) + '\n';
        for (const socket of this.replicas) {
            try {
                socket.write(payload);
            } catch (e) {
                this.replicas.delete(socket);
            }
        }
    }

    // Called when a new socket connects and identifies as replica
    registerReplica(socket) {
        if (this.role !== 'PRIMARY') return false;
        this.replicas.add(socket);
        console.log("[Replication] New Replica registered.");
        return true;
    }

    _applyReplicationEvent(event) {
        if (this.role !== 'REPLICA') return;

        console.log(`[Replication] Applying event: ${event.type} on ${event.table}`);

        // Map Events to Engine Operations
        // OnTableInserted -> INSERT
        // OnTableUpdated -> UPDATE
        // OnTableDeleted -> DELETE
        // Note: This requires the event payload to contain the actual data/criteria
        // SawitDB v3.0 DBEvent might only send metadata currently. 
        // This is a stub for full implementation.

        if (event.type === 'OnTableInserted' && event.data) {
            this.engine.insertExecutor.execute({
                type: 'INSERT', table: event.table, data: event.data
            });
        }
        // ... implementations for Update/Delete
    }
}

module.exports = ReplicationManager;
