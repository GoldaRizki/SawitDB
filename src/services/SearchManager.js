const fs = require('fs');
const path = require('path');

/**
 * SearchManager (BLUSUKAN)
 * Handles Full-Text Search (FTS) using a simple Inverted Index.
 * 
 * System Table: _fts_index
 * Structure: { term: { table: { rowId: [col1, col2] } } }
 * OR Simplified: { term: [ { t: table, id: rowId, c: col } ] }
 */
class SearchManager {
    constructor(engine) {
        this.engine = engine;
        this.indexPath = null;
        this.index = {}; // In-memory inverted index
        this.stopWords = new Set(['dan', 'atau', 'yang', 'di', 'ke', 'dari', 'ini', 'itu', 'the', 'and', 'or', 'of', 'to', 'in']);
    }

    /**
     * Initialize FTS Index
     */
    async init() {
        this.indexPath = path.join(this.engine.dbPath, '_fts_index.json');

        if (fs.existsSync(this.indexPath)) {
            try {
                const data = fs.readFileSync(this.indexPath, 'utf8');
                this.index = JSON.parse(data);
            } catch (e) {
                console.error("Failed to load FTS index:", e);
                this.index = {};
            }
        }
    }

    /**
     * Save index to disk
     */
    save() {
        if (!this.indexPath) return;
        fs.writeFileSync(this.indexPath, JSON.stringify(this.index));
    }

    /**
     * Tokenize text into words
     */
    tokenize(text) {
        if (!text || typeof text !== 'string') return [];
        return text.toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove punctuation
            .split(/\s+/)
            .filter(w => w.length > 2 && !this.stopWords.has(w));
    }

    /**
     * Index a row's data
     * Called on INSERT/UPDATE
     */
    indexRow(table, id, data) {
        for (const [col, val] of Object.entries(data)) {
            const tokens = this.tokenize(val);
            for (const token of tokens) {
                if (!this.index[token]) this.index[token] = [];

                // Avoid duplicates
                const exists = this.index[token].find(entry => entry.t === table && entry.id === id);
                if (!exists) {
                    this.index[token].push({ t: table, id: id });
                }
            }
        }
        this.save(); // Simple persistence
    }

    /**
     * Remove tokens for a row
     * Called on UPDATE (before re-index) / DELETE
     */
    deindexRow(table, id) {
        for (const token in this.index) {
            this.index[token] = this.index[token].filter(entry => !(entry.t === table && entry.id === id));
            if (this.index[token].length === 0) {
                delete this.index[token];
            }
        }
        this.save();
    }

    /**
     * Perform Search
     * Query: BLUSUKAN KE [table] CARI "term"
     */
    search(table, term) {
        const tokens = this.tokenize(term);
        if (tokens.length === 0) return [];

        // Find matches for all tokens (AND logic)
        // For simple version, let's do OR logic or just first token?
        // Let's do AND logic for "term term"

        let candidateIds = null;

        for (const token of tokens) {
            const entries = this.index[token] || [];
            const ids = entries.filter(e => e.t === table).map(e => e.id);

            if (candidateIds === null) {
                candidateIds = new Set(ids);
            } else {
                // Intersection (AND)
                const currentSet = new Set(ids);
                candidateIds = new Set([...candidateIds].filter(x => currentSet.has(x)));
            }

            if (candidateIds.size === 0) break;
        }

        if (!candidateIds) return [];

        // Retrieve actual rows
        const manager = this.engine.tableManagers[table];
        if (!manager) return [];

        const results = [];
        for (const id of candidateIds) {
            const row = manager.pager.getRow(id); // direct access if supported or via scan
            // WowoEngine usually scans. We need a way to getByID.
            // If TableManager doesn't support getRow(id), we might have to filter.
            // Assumption: TableManager has basic get capabilities or we filter execution.
            // For now, let's assume we return IDs and the engine filters? 
            // Or better: Load the row efficiently.

            // NOTE: WowoEngine v3 might not have RowID direct lookup exposed publicly easily
            // without index. We'll iterate table and match IDs if we must, 
            // BUT SearchManager is supposed to be fast.
            // Let's assume we return the rows if we can resolve them.
            // If not, we return a virtual result set.

            if (row) results.push(row);
        }

        // Return full rows?
        // Actually, the engine's SELECT executor usually scans.
        // We might need to extend TableManager to fetch by ID list.
        // For MVP, we will assume we can scan or the user accepts IDs?
        // Let's return IDs and let the caller handle?
        // No, 'BLUSUKAN' command usually returns results.

        // HACK for MVP: We restart table scan and match offsets (RowID).
        // OR better: use ID if available. 
        // Let's return objects with `_id` and score.
        // Since we can't easily fetch randomly without index, 
        // we might leave fetching to the engine if we return a criteria?
        // But BLUSUKAN is a separate command.

        // Implementation:
        // We will scan the table and filter by ID. Optimized scan.
        const allRows = manager.getAllRows(); // Expensive but safe fallback
        return allRows.filter(r => candidateIds.has(r._id) || candidateIds.has(r.id));
    }
}

module.exports = SearchManager;
