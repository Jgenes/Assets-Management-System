const app = require('./app');
const seed = require('./db/seed');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    // Seed initial database if empty
    await seed();

    app.listen(PORT, HOST, () => {
      console.log('================================================================');
      console.log(' MOSHI CO-OPERATIVE UNIVERSITY (MoCU)');
      console.log(' ENTERPRISE ASSET MANAGEMENT SYSTEM (AMS)');
      console.log('================================================================');
      console.log(`Server listening on http://${HOST}:${PORT}`);
      console.log(`API base endpoint: http://${HOST}:${PORT}/api/v1`);
      console.log(`Live Preview host ready.`);
      console.log('================================================================');
    });
  } catch (err) {
    console.error('Failed to start MoCU AMS server:', err);
    process.exit(1);
  }
}

start();
