const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/p_dot');
    console.log(`[P_Dot] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[P_Dot Error] MongoDB Connection Failure: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
