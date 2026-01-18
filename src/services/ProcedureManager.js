/**
 * ProcedureManager - Manages Stored Procedures (SOP) for SawitDB
 * Allows saving and executing script blocks / macros.
 */
class ProcedureManager {
    constructor(engine) {
        this.engine = engine;
        this.procedures = new Map(); // name -> body/query
    }

    loadProcedures() {
        if (!this.engine.tableManager.findTableEntry('_procedures')) {
            try {
                this.engine.tableManager.createTable('_procedures', true);
            } catch (e) {
                // Ignore
            }
            return;
        }

        const results = this.engine.selectExecutor.execute({
            type: 'SELECT',
            table: '_procedures',
            cols: ['*']
        });

        if (results) {
            for (const proc of results) {
                this.procedures.set(proc.name, proc.body);
            }
            console.log(`[ProcedureManager] Loaded ${this.procedures.size} procedures.`);
        }
    }

    /**
     * Save a Stored Procedure
     * SIMPAN SOP [nama] SEBAGAI [query]
     */
    saveProcedure(name, body) {
        // Upsert logic
        if (this.procedures.has(name)) {
            // Update
            this.engine.updateExecutor.execute({
                type: 'UPDATE',
                table: '_procedures',
                updates: { body: body, updated_at: new Date().toISOString() },
                criteria: { key: 'name', op: '=', val: name }
            });
        } else {
            // Insert
            this.engine.insertExecutor.execute({
                type: 'INSERT',
                table: '_procedures',
                data: {
                    name: name,
                    body: body,
                    created_at: new Date().toISOString()
                }
            });
        }

        this.procedures.set(name, body);
        return `Procedure '${name}' saved.`;
    }

    /**
     * Execute a Stored Procedure
     * JALANKAN SOP [nama]
     */
    executeProcedure(name) {
        if (!this.procedures.has(name)) {
            throw new Error(`Procedure '${name}' not found.`);
        }

        const body = this.procedures.get(name);
        // Execute the stored query/script
        // Note: Currently supports single query body. Future: Multi-line / script parsing.
        return this.engine.query(body);
    }

    dropProcedure(name) {
        if (!this.procedures.has(name)) {
            throw new Error(`Procedure '${name}' not found.`);
        }

        this.engine.deleteExecutor.execute({
            type: 'DELETE',
            table: '_procedures',
            criteria: { key: 'name', op: '=', val: name }
        });

        this.procedures.delete(name);
        return `Procedure '${name}' dropped.`;
    }
}

module.exports = ProcedureManager;
