# SawitDB - Network Edition

![SawitDB Banner](sawitdb.jpg)

**SawitDB** is now a **networked database system** with MongoDB-like connectivity! Connect using `sawitdb://` protocol and manage your data remotely.

## 🚀 What's New in v2.0

### Network Features
- ✅ **Client-Server Architecture** - TCP server with JSON protocol
- ✅ **MongoDB-style Connection** - Use `sawitdb://host:port/database`
- ✅ **Multi-database Support** - Create and manage multiple databases
- ✅ **Authentication** - Optional username/password protection
- ✅ **Connection Management** - Handle multiple concurrent clients

### Quick Wins Implemented
- ✅ **B-Tree Indexing** - Fast lookups with `INDEKS` command
- ✅ **Aggregation** - COUNT, SUM, AVG, MIN, MAX, GROUP BY
- ✅ **Enhanced WHERE** - Support for AND/OR logic
- ✅ **Better Performance** - Index-accelerated queries

## 📦 Installation

```bash
git clone https://github.com/YourRepo/SawitDB.git
cd SawitDB
```

No dependencies needed - pure Node.js!

## 🎯 Quick Start

### 1. Start the Server

```bash
node start_server.js
```

The server will start on `localhost:7878` by default.

**Environment Variables:**
```bash
SAWIT_PORT=7878           # Port to listen on
SAWIT_HOST=0.0.0.0        # Host to bind to
SAWIT_DATA_DIR=./data     # Directory for .sawit files
SAWIT_AUTH=user:pass      # Enable authentication (optional)
```

### 2. Connect with Client

**Option A: Interactive CLI**
```bash
node cli_client.js sawitdb://localhost:7878/mydb
```

**Option B: Programmatic Usage**
```javascript
const SawitClient = require('./SawitClient');

const client = new SawitClient('sawitdb://localhost:7878/plantation');
await client.connect();

// Execute queries
const result = await client.query('LAHAN sawit');
await client.query("TANAM KE sawit (id, name) BIBIT (1, 'Tree1')");
const data = await client.query('PANEN * DARI sawit');

client.disconnect();
```

### 3. Run Example

```bash
# In terminal 1: Start server
node start_server.js

# In terminal 2: Run example
node example_client.js
```

## 🌴 Connection String Format

```
sawitdb://[username:password@]host:port/database
```

**Examples:**
- `sawitdb://localhost:7878/plantation`
- `sawitdb://admin:secret@10.0.0.5:7878/mydb`
- `sawitdb://192.168.1.100:7878/test`

## 📖 New Commands

### Index Management

#### Create Index
```sql
INDEKS [table] PADA [field]
```
Example: `INDEKS sawit PADA jenis`

#### Show Indexes
```sql
LIHAT INDEKS [table]
```
Example: `LIHAT INDEKS sawit`

### Aggregation

#### COUNT
```sql
HITUNG COUNT(*) DARI [table]
HITUNG COUNT(*) DARI [table] DIMANA [condition]
```

#### SUM / AVG / MIN / MAX
```sql
HITUNG SUM(field) DARI [table]
HITUNG AVG(field) DARI [table]
HITUNG MIN(field) DARI [table]
HITUNG MAX(field) DARI [table]
```

#### GROUP BY
```sql
HITUNG COUNT(*) DARI [table] KELOMPOK [field]
HITUNG AVG(price) DARI [table] KELOMPOK category
```

### Enhanced WHERE Clauses

#### AND Logic
```sql
PANEN * DARI sawit DIMANA jenis = 'Tenera' AND umur > 5
```

#### OR Logic
```sql
PANEN * DARI sawit DIMANA umur < 3 OR umur > 10
```

#### Combined
```sql
PANEN * DARI sawit DIMANA jenis = 'Tenera' AND umur > 5 AND produksi > 100
```

## 🔧 Client API

### Connection

```javascript
const client = new SawitClient(connectionString);
await client.connect();
```

### Database Operations

```javascript
// Switch database
await client.use('mydb');

// List all databases
const databases = await client.listDatabases();

// Drop database
await client.dropDatabase('olddb');

// Ping server
const { latency } = await client.ping();
```

### Query Operations

```javascript
// Execute any AQL query
const result = await client.query('PANEN * DARI sawit');

// Disconnect
client.disconnect();
```

## 🏗️ Architecture

### Components

1. **SawitServer.js** - TCP server handling client connections
2. **SawitClient.js** - Client library for connecting to server
3. **WowoEngine.js** - Enhanced database engine with indexing
4. **BTreeIndex.js** - B-Tree implementation for fast lookups
5. **Pager** - 4KB page-based storage system

### Protocol

JSON-based wire protocol over TCP:

**Request:**
```json
{
  "type": "query",
  "payload": { "query": "PANEN * DARI sawit" }
}
```

**Response:**
```json
{
  "type": "query_result",
  "result": [{"id": 1, "name": "Tree1"}]
}
```

### Data Flow

```
Client (sawitdb://)
    ↓
TCP Connection
    ↓
SawitServer
    ↓
WowoEngine + BTreeIndex
    ↓
Pager (4KB pages)
    ↓
.sawit file
```

## 📊 Performance

### With Indexing
- **Indexed Lookups**: O(log n) - ~1000x faster than full scan
- **Insert**: O(log n) per index
- **Aggregation**: O(n) with optimizations

### Network Overhead
- **Latency**: ~1-5ms on localhost
- **Throughput**: Limited by JSON parsing, not network

## 🎮 Example Session

```bash
$ node cli_client.js sawitdb://localhost:7878/farm

default> LAHAN crops
Kebun 'crops' telah dibuka.

default> .use farm
Using database 'farm'

farm> TANAM KE crops (id, name, qty) BIBIT (1, 'Rice', 100)
Bibit tertanam.

farm> INDEKS crops PADA name
Indeks dibuat pada 'crops.name' (1 records indexed)

farm> PANEN * DARI crops DIMANA name = 'Rice'
[
  { "id": 1, "name": "Rice", "qty": 100 }
]

farm> HITUNG COUNT(*) DARI crops
{ "count": 1 }

farm> EXIT
Disconnecting...
```

## 🔐 Security

### Authentication (Optional)

Start server with auth:
```bash
SAWIT_AUTH=admin:secret123 node start_server.js
```

Connect with credentials:
```javascript
const client = new SawitClient('sawitdb://admin:secret123@localhost:7878/db');
```

### Network Security

- Server binds to `0.0.0.0` by default (all interfaces)
- For production, bind to specific IP: `SAWIT_HOST=127.0.0.1`
- Use firewall rules to restrict access
- Consider SSH tunneling for remote access

## 🛣️ Roadmap

- [ ] SSL/TLS encryption
- [ ] Connection pooling
- [ ] Query result streaming
- [ ] Transactions with rollback
- [ ] Replication (master-slave)
- [ ] Sharding support
- [ ] Query optimization with query planner
- [ ] Binary protocol (faster than JSON)
- [ ] GraphQL-style queries
- [ ] Web dashboard UI

## 📚 Original Features

All original SawitDB features remain:
- Paged architecture (4KB pages)
- Single-file storage (`.sawit`)
- Agricultural Query Language (AQL)
- ACID guarantees with fsync
- Zero dependencies

See [ORIGINAL_README.md](ORIGINAL_README.md) for full details.

## 🤝 Contributing

This is a prototype! Contributions welcome:
- Performance optimizations
- New aggregate functions  
- Query optimizer
- Better protocol design
- Security improvements

## 📄 License

Same as original SawitDB project.

## 🌴 Support

- **Original Creator**: Support on Saweria
- **Network Edition**: Community-driven

---

**Built with the spirit of "Kemandirian Data"** 🇮🇩

No expensive infrastructure. No vendor lock-in. Just pure Node.js and farming spirit! 🌴
