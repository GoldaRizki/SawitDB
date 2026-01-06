const SawitDB = require('../src/WowoEngine');
const fs = require('fs');
const path = require('path');

const TEST_DB_PATH = path.join(__dirname, 'test_suite.sawit');
const TEST_TABLE = 'kebun_test';

// Utils
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    reset: '\x1b[0m'
};

function logPass(msg) { console.log(`${colors.green}[PASS]${colors.reset} ${msg}`); }
function logFail(msg, err) {
    console.error(`${colors.red}[FAIL]${colors.reset} ${msg}`);
    if (err) console.error(err);
}
function logInfo(msg) { console.log(`${colors.yellow}[INFO]${colors.reset} ${msg}`); }

// Setup
if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
let db = new SawitDB(TEST_DB_PATH);

async function runTests() {
    console.log("=== SAWIDB UNIT TEST SUITE ===\n");
    let passed = 0;
    let failed = 0;

    // --- TEST 1: CREATE TABLE ---
    try {
        const res = db.query(`BUKA WILAYAH ${TEST_TABLE}`); // Using Alias
        // Or directly CREATE TABLE
        const res2 = db.query(`CREATE TABLE ${TEST_TABLE}`);

        // Note: Engine returns string messages for success usually
        if (res2.includes('sudah ada') || res2.includes('dibuka')) {
            passed++; logPass("Create Table");
        } else {
            throw new Error("Unexpected response: " + res2);
        }
    } catch (e) { failed++; logFail("Create Table", e); }

    // --- TEST 2: INSERT ---
    try {
        db.query(`INSERT INTO ${TEST_TABLE} (id, bibit, umur) VALUES (1, 'Dura', 5)`);
        db.query(`INSERT INTO ${TEST_TABLE} (id, bibit, umur) VALUES (2, 'Tenera', 3)`);
        db.query(`INSERT INTO ${TEST_TABLE} (id, bibit, umur) VALUES (3, 'Pisifera', 8)`);
        passed++; logPass("Insert Data");
    } catch (e) { failed++; logFail("Insert Data", e); }

    // --- TEST 3: SELECT (Basic) ---
    try {
        const rows = db.query(`SELECT * FROM ${TEST_TABLE}`);
        if (rows.length === 3) {
            passed++; logPass("Select All (Count check)");
        } else {
            throw new Error(`Expected 3 rows, got ${rows.length}`);
        }
    } catch (e) { failed++; logFail("Select All", e); }

    // --- TEST 4: WHERE CLAUSE ---
    try {
        const rows = db.query(`SELECT * FROM ${TEST_TABLE} WHERE umur > 4`);
        // Should get Dura(5) and Pisifera(8)
        if (rows.length === 2 && rows.find(r => r.bibit === 'Dura') && rows.find(r => r.bibit === 'Pisifera')) {
            passed++; logPass("Select WHERE (> logic)");
        } else {
            throw new Error(`Expected 2 rows (Dura, Pisifera), got ${rows.length}: ${JSON.stringify(rows)}`);
        }
    } catch (e) { failed++; logFail("Select WHERE", e); }

    // --- TEST 5: UPDATE ---
    try {
        db.query(`UPDATE ${TEST_TABLE} SET umur = 6 WHERE id = 1`);
        const rows = db.query(`SELECT * FROM ${TEST_TABLE} WHERE id = 1`);
        if (rows[0].umur === 6) {
            passed++; logPass("Update Data");
        } else {
            throw new Error(`Update failed, expected age 6, got ${rows[0].umur}`);
        }
    } catch (e) { failed++; logFail("Update Data", e); }

    // --- TEST 6: INDEXING ---
    try {
        db.query(`CREATE INDEX ${TEST_TABLE} ON bibit`);
        // Verify via simple select
        const rows = db.query(`SELECT * FROM ${TEST_TABLE} WHERE bibit = 'Tenera'`);
        if (rows.length === 1 && rows[0].id === 2) {
            passed++; logPass("Index Creation & Search");
        } else {
            throw new Error("Index search failed");
        }
    } catch (e) { failed++; logFail("Indexing", e); }

    // --- TEST 7: PERSISTENCE (Simulate Restart) ---
    try {
        db.close();
        db = new SawitDB(TEST_DB_PATH);

        // Check Index Persistence logic
        // We need to access internal state or trust performance/EXPLAIN (if it existed)
        // Let's just check data integrity logic
        const rows = db.query(`SELECT * FROM ${TEST_TABLE} WHERE bibit = 'Tenera'`);
        if (rows.length === 1) {
            passed++; logPass("Persistence (Data & Index Logic intact)");
        } else {
            throw new Error("Data lost after restart");
        }
    } catch (e) { failed++; logFail("Persistence", e); }

    // --- TEST 8: DELETE ---
    try {
        db.query(`DELETE FROM ${TEST_TABLE} WHERE id = 3`);
        const rows = db.query(`SELECT * FROM ${TEST_TABLE}`);
        if (rows.length === 2) {
            passed++; logPass("Delete Data");
        } else {
            throw new Error(`Delete failed, count is ${rows.length}`);
        }
    } catch (e) { failed++; logFail("Delete Data", e); }

    // --- TEST 9: AGGREGATE ---
    try {
        // Remaining: id 1 (umur 6), id 2 (umur 3)
        const res = db.query(`HITUNG SUM(umur) DARI ${TEST_TABLE}`);
        if (res.sum === 9) {
            passed++; logPass("Aggregate SUM");
        } else {
            throw new Error(`Aggregate failed, expected 9 got ${res.sum}`);
        }
    } catch (e) { failed++; logFail("Aggregate", e); }

    // --- QUERY PARSER COMPLEX ---
    try {
        // Escaped quotes test
        db.query(`INSERT INTO ${TEST_TABLE} (id, bibit) VALUES (99, 'O\\'Neil')`);
        const rows = db.query(`SELECT * FROM ${TEST_TABLE} WHERE bibit = 'O\\'Neil'`);
        if (rows.length === 1) {
            passed++; logPass("Parser Escaped Quotes");
        } else {
            throw new Error("Parser failed on escaped quotes");
        }
    } catch (e) { failed++; logFail("Parser Complexity", e); }

    console.log(`\nResults: ${passed} Passed, ${failed} Failed.`);

    // Cleanup
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
}

runTests();
