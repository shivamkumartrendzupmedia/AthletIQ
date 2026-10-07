import type { Server } from 'http';
import { createApp } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { env } from './config/env.js';

const startServer = async (): Promise<void> => {
  try {
    // 1. Connect to MongoDB first before accepting requests
    await connectDB();

    // 2. Initialize Express application
    const app = createApp();

    // 3. Start listening on configured port
    const server: Server = app.listen(env.PORT, () => {
      console.log(`🚀 ATHLETIQ Backend listening on port ${env.PORT} [${env.NODE_ENV}]`);
      console.log(`🩺 Health check available at http://localhost:${env.PORT}/api/health`);
    });

    // 4. Graceful shutdown handler (close server, then close DB connection)
    const handleShutdown = (signal: string): void => {
      console.log(`\n🛑 Received ${signal}. Initiating graceful shutdown...`);

      server.close(async (serverErr) => {
        if (serverErr) {
          console.error('❌ Error closing HTTP server:', serverErr.name || 'Error');
        } else {
          console.log('🚪 HTTP server closed.');
        }

        await disconnectDB();
        console.log('✅ Clean shutdown complete. Exiting process.');
        process.exit(0);
      });

      // Force exit fallback if connections refuse to close in 10s
      setTimeout(() => {
        console.error('⚠️  Forced exit after shutdown timeout.');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  } catch (err) {
    const error = err as Error;
    console.error('❌ Server startup failure:', error.name || 'StartupError');
    process.exit(1);
  }
};

void startServer();
