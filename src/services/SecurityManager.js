const fs = require('fs');
const path = require('path');

/**
 * SecurityManager (POS RONDA)
 * Handles Role-Based Access Control (RBAC) and Table-level permissions.
 * 
 * System Table: _permissions
 * Structure: [ { user: 'alice', table: 'users', action: 'read' }, ... ]
 * Actions: 'read' (SELECT), 'write' (INSERT/UPDATE/DELETE), 'all' (*)
 */
class SecurityManager {
    constructor(engine) {
        this.engine = engine;
        this.permissions = []; // In-memory permissions cache
        this.permissionsPath = null;
    }

    async init() {
        this.permissionsPath = path.join(this.engine.dbPath, '_permissions.json');

        if (fs.existsSync(this.permissionsPath)) {
            try {
                this.permissions = JSON.parse(fs.readFileSync(this.permissionsPath, 'utf8'));
            } catch (e) {
                console.error("Failed to load permissions:", e);
                this.permissions = [];
            }
        } else {
            // Default: No permissions file = Open Access? 
            // Or should we create default admin?
            // "SawitDB is open by default".
            this.save();
        }
    }

    save() {
        if (!this.permissionsPath) return;
        fs.writeFileSync(this.permissionsPath, JSON.stringify(this.permissions, null, 2));
    }

    /**
     * Grant Permission
     * BERI IZIN [action] KEPADA [user] DI [table]
     */
    grant(user, table, action) {
        // Remove existing identical permission to avoid dupe
        this.permissions = this.permissions.filter(p => !(p.user === user && p.table === table && p.action === action));

        this.permissions.push({ user, table, action });
        this.save();
        return `Izin '${action}' diberikan kepada '${user}' untuk '${table}'.`;
    }

    /**
     * Revoke Permission
     * CABUT IZIN [action] DARI [user] DI [table]
     */
    revoke(user, table, action) {
        const initialLength = this.permissions.length;
        this.permissions = this.permissions.filter(p => !(p.user === user && p.table === table && p.action === action));

        this.save();
        if (this.permissions.length < initialLength) {
            return `Izin '${action}' dicabut dari '${user}' untuk '${table}'.`;
        }
        return `Izin tidak ditemukan.`;
    }

    /**
     * Check Permission
     * @param {string} user - Username from session
     * @param {string} table - Target table
     * @param {string} action - 'read' or 'write'
     */
    check(user, table, action) {
        if (!user) return true; // If no user (local mode), allow all.
        if (user === 'admin') return true; // Superuser

        // Check specifically for Table matches or Wildcard '*'
        const hasPerm = this.permissions.some(p =>
            p.user === user &&
            (p.table === table || p.table === '*') &&
            (p.action === action || p.action === 'all')
        );

        if (!hasPerm) {
            throw new Error(`POS RONDA: Akses Ditolak! User '${user}' tidak punya izin '${action}' di lahan '${table}'.`);
        }
        return true;
    }
}

module.exports = SecurityManager;
