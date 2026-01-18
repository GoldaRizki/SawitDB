/**
 * TriggerManager - Manages Event Triggers (KENTONGAN) for SawitDB
 * Intercepts INSERT, UPDATE, DELETE and executes defined actions.
 */
class TriggerManager {
    constructor(engine) {
        this.engine = engine;
        this.triggers = []; // In-memory cache of triggers
    }

    /**
     * Load triggers from _triggers system table
     */
    loadTriggers() {
        if (!this.engine.tableManager.findTableEntry('_triggers')) {
            try {
                this.engine.tableManager.createTable('_triggers', true);
            } catch (e) {
                // Ignore
            }
            return;
        }

        const results = this.engine.selectExecutor.execute({
            type: 'SELECT',
            table: '_triggers',
            cols: ['*']
        });

        this.triggers = results || [];
        console.log(`[TriggerManager] Loaded ${this.triggers.length} triggers.`);
    }

    /**
     * Create a new Trigger
     * PASANG KENTONGAN [nama] PADA [event] [table] LAKUKAN [query]
     */
    createTrigger(triggerName, event, table, actionQuery) {
        // 1. Check if trigger exists
        const exists = this.triggers.some(t => t.name === triggerName);
        if (exists) throw new Error(`Trigger '${triggerName}' already exists.`);

        // 2. Validate event
        const validEvents = ['INSERT', 'UPDATE', 'DELETE'];
        if (!validEvents.includes(event.toUpperCase())) {
            throw new Error(`Invalid trigger event: ${event}. Must be INSERT, UPDATE, or DELETE.`);
        }

        // 3. Save to system table
        const triggerDef = {
            name: triggerName,
            event: event.toUpperCase(),
            table_name: table,
            action: actionQuery,
            created_at: new Date().toISOString()
        };

        this.engine.insertExecutor.execute({
            type: 'INSERT',
            table: '_triggers',
            data: triggerDef
        });

        // 4. Update memory
        this.triggers.push(triggerDef);

        return `Trigger '${triggerName}' created successfully.`;
    }

    /**
     * Drop a Trigger
     * BUANG KENTONGAN [nama]
     */
    dropTrigger(triggerName) {
        const index = this.triggers.findIndex(t => t.name === triggerName);
        if (index === -1) throw new Error(`Trigger '${triggerName}' not found.`);

        // Remove from system table
        this.engine.deleteExecutor.execute({
            type: 'DELETE',
            table: '_triggers',
            criteria: { key: 'name', op: '=', val: triggerName }
        });

        // Remove from memory
        this.triggers.splice(index, 1);

        return `Trigger '${triggerName}' dropped.`;
    }

    /**
     * Execute triggers for a specific event on a table
     * @param {string} event - INSERT, UPDATE, DELETE
     * @param {string} table - Table name
     * @param {object} contextData - Data involved in the event (optional, for future use like NEW.id)
     */
    handleEvent(event, table, contextData = null) {
        const relevantTriggers = this.triggers.filter(
            t => t.event === event && t.table_name === table
        );

        for (const trigger of relevantTriggers) {
            try {
                // console.log(`[Trigger] Executing '${trigger.name}' for ${event} on ${table}`);

                // Simple implementation: Execute the action query string
                // Note: v1 does not support binding NEW.field or OLD.field yet
                this.engine.query(trigger.action);

            } catch (e) {
                console.error(`[Trigger] Failed to execute '${trigger.name}': ${e.message}`);
                // Continue executing other triggers? Or throw?
                // For now, log and continue to avoid breaking main operation
            }
        }
    }
}

module.exports = TriggerManager;
