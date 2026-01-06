const SawitDB = require('../src/WowoEngine');
const fs = require('fs');

console.log("=".repeat(80));
console.log("ACCURATE BENCHMARK - PRE-GENERATED QUERIES");
console.log("=".repeat(80));
console.log("\nTarget: Exceed v2.4 baseline");
console.log("- INSERT:  >= 3,000 TPS");
console.log("- SELECT:  >= 3,000 TPS");
console.log("- UPDATE:  >= 3,000 TPS");
console.log("- DELETE:  >= 3,000 TPS");
console.log("- WAL   :  " + (process.env.WAL !== 'false' ? 'ENABLED (' + (process.env.WAL_MODE || 'normal') + ')' : 'DISABLED') + "\n");

const DB_PATH = './data/accurate_benchmark.sawit';
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
if (fs.existsSync(DB_PATH + '.wal')) fs.unlinkSync(DB_PATH + '.wal');

// WAL Configuration (Default enabled for benchmark unless overridden)
const walEnabled = process.env.WAL !== 'false';
const walMode = process.env.WAL_MODE || 'normal';

const db = new SawitDB(DB_PATH, {
    wal: {
        enabled: walEnabled,
        syncMode: walMode,
        checkpointInterval: 10000
    }
});
const N = 10000;

// Setup
console.log("Setting up...");
db.query('CREATE TABLE products');
for (let i = 0; i < N; i++) {
    const price = Math.floor(Math.random() * 1000) + 1;
    db.query(`INSERT INTO products (id, price) VALUES (${i}, ${price})`);
}
db.query('CREATE INDEX ON products (id)');
console.log("✓ Setup complete\n");

// Pre-generate queries to eliminate random() overhead
const selectQueries = [];
const updateQueries = [];
for (let i = 0; i < 1000; i++) {
    const id = Math.floor(Math.random() * N);
    selectQueries.push(`SELECT * FROM products WHERE id = ${id}`);
    updateQueries.push(`UPDATE products SET price = ${Math.floor(Math.random() * 1000)} WHERE id = ${id}`);
}

function benchmark(name, queries, target) {
    // Warmup
    for (let i = 0; i < 10; i++) db.query(queries[i % queries.length]);

    const start = Date.now();
    let min = Infinity;
    let max = -Infinity;

    for (const query of queries) {
        const t0 = process.hrtime.bigint();
        db.query(query);
        const t1 = process.hrtime.bigint();
        const duration = Number(t1 - t0) / 1e6; // ms
        if (duration < min) min = duration;
        if (duration > max) max = duration;
    }
    const time = Date.now() - start;
    const tps = Math.round(queries.length / (time / 1000));
    const avg = (time / queries.length).toFixed(3);
    const status = tps >= target ? '✅ PASS' : '❌ FAIL';
    const pct = Math.round((tps / target) * 100);

    return { name, tps, avg, min: min.toFixed(3), max: max.toFixed(3), target, status, pct };
}

const results = [];

console.log("Running benchmarks...\n");

// INSERT
const insertQueries = [];
for (let i = 0; i < 1000; i++) {
    insertQueries.push(`INSERT INTO products (id, price) VALUES (${N + i}, 999)`);
}
results.push(benchmark('INSERT', insertQueries, 3000));

// Cleanup inserts
for (let i = 0; i < 1000; i++) {
    db.query(`DELETE FROM products WHERE id = ${N + i}`);
}

// SELECT (indexed)
results.push(benchmark('SELECT (indexed)', selectQueries, 3000));

// UPDATE
results.push(benchmark('UPDATE (indexed)', updateQueries, 3000));

// DELETE
const deleteQueries = [];
for (let i = 0; i < 500; i++) {
    db.query(`INSERT INTO products (id, price) VALUES (${N + i}, 1)`);
    deleteQueries.push(`DELETE FROM products WHERE id = ${N + i}`);
}
results.push(benchmark('DELETE (indexed)', deleteQueries, 3000));

console.log("=".repeat(100));
console.log("RESULTS");
console.log("=".repeat(100));
console.log("┌────────────────────────────┬──────────┬──────────┬──────────┬──────────┬────────┬─────────┬────────┐");
console.log("│ Operation                  │   TPS    │ Avg (ms) │ Min (ms) │ Max (ms) │ Target │   %     │ Status │");
console.log("├────────────────────────────┼──────────┼──────────┼──────────┼──────────┼────────┼─────────┼────────┤");

let passCount = 0;
for (const r of results) {
    const name = r.name.padEnd(26);
    const tps = r.tps.toString().padStart(8);
    const avg = r.avg.padStart(8);
    const min = r.min.padStart(8);
    const max = r.max.padStart(8);
    const target = r.target.toString().padStart(6);
    const pct = (r.pct + '%').padStart(7);
    const status = r.status.padEnd(6);

    if (r.status.includes('PASS')) passCount++;
    console.log(`│ ${name} │ ${tps} │ ${avg} │ ${min} │ ${max} │ ${target} │ ${pct} │ ${status} │`);
}

console.log("└────────────────────────────┴──────────┴──────────┴──────────┴──────────┴────────┴─────────┴────────┘");

const passRate = Math.round((passCount / results.length) * 100);
console.log(`\nPass Rate: ${passRate}% (${passCount}/${results.length})`);

if (passRate === 100) {
    console.log("\n100% PASS");
} else {
    console.log(`\n⚠️  ${results.length - passCount} operation(s) still below target`);
}


db.close(); // Ensure handles are released
fs.unlinkSync(DB_PATH);
try {
    if (fs.existsSync(DB_PATH + '.wal')) fs.unlinkSync(DB_PATH + '.wal');
} catch (e) { }

console.log("\nBenchmark Complete");
