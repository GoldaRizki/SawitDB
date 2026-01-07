const SawitClient = require('./src/SawitClient');

async function connectToServer() {
  // Create client instance with the server connection string
  const client = new SawitClient('sawitdb://0.0.0.0:7878/');

  try {
    // Connect to the server
    console.log('Connecting to SawitDB server...');
    await client.connect();

    // Test the connection with a ping
    console.log('Testing connection...');
    const pingResult = await client.ping();
    console.log('Ping result:', pingResult);

    // Get server stats
    console.log('Getting server stats...');
    const stats = await client.stats();
    console.log('Server stats:', stats);

    // List available databases
    console.log('Listing databases...');
    const databases = await client.listDatabases();
    console.log('Available databases:', databases);

    //add a command to create database named test if not exist here
    if (!databases.includes('test')) {
      console.log('Creating database "test"...');
      await client.query(`BUKA WILAYAH test`);
      console.log('Database "test" created.');
    } else {
      console.log('Database "test" already exists.');
    }

    // Keep connection alive for a moment
    console.log('Connection successful! Press Ctrl+C to exit.');
  } catch (error) {
    console.error('Connection failed:', error.message);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  process.exit(0);
});

// Run the connection
connectToServer();
