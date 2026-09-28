const mongoose = require('mongoose');

let mongodInstance = null;

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/queueless';
    
    // Set connection options with quick timeout so fallback is instant if no local mongod
    const connOptions = {
      serverSelectionTimeoutMS: 2500,
    };

    try {
      console.log(`📡 Connecting to MongoDB at ${mongoUri}...`);
      const conn = await mongoose.connect(mongoUri, connOptions);
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (localErr) {
      console.warn(`⚠️ Could not connect to local/configured MongoDB (${localErr.message}).`);
      console.log(`🚀 Starting high-performance embedded MongoDB engine for seamless execution...`);
      
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongodInstance = await MongoMemoryServer.create({
        instance: {
          dbName: 'queueless'
        }
      });
      const memoryUri = mongodInstance.getUri();
      const conn = await mongoose.connect(memoryUri);
      console.log(`✅ Connected to Embedded In-Memory MongoDB at: ${memoryUri}`);
      return conn;
    }
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongodInstance) {
      await mongodInstance.stop();
    }
  } catch (err) {
    console.error('Error disconnecting DB:', err);
  }
};

module.exports = { connectDB, disconnectDB };
