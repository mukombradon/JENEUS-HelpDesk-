import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from '../config';

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------
let io: Server | null = null;

/**
 * Return the active Socket.io server instance.
 * Throws if called before initializeSocket / setupSocket.
 */
export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.io has not been initialized. Call initializeSocket() first.');
  }
  return io;
}

// ---------------------------------------------------------------------------
// Auth middleware — verifies JWT from handshake auth.token
// ---------------------------------------------------------------------------
function authMiddleware(socket: Socket, next: (err?: Error) => void): void {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret) as {
      id: string;
      email: string;
      role: string;
    };

    (socket as any).user = decoded;
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Initialize a Socket.io server attached to the given HTTP server.
 * Use this when you need to pass custom corsOptions (e.g. from config).
 *
 * Also sets up auth middleware and connection handlers.
 */
export function initializeSocket(httpServer: HttpServer, corsOptions: object): Server {
  io = new Server(httpServer, { cors: corsOptions });

  io.use(authMiddleware);

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    console.log(`[Socket] User connected: ${user?.email ?? 'unknown'} (${socket.id})`);

    // Join a personal room so we can target individual users
    if (user?.id) {
      socket.join(`user:${user.id}`);
    }

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] User disconnected: ${user?.email ?? 'unknown'} (${reason})`);
    });
  });

  console.log('[Socket] Socket.io initialized');
  return io;
}

/**
 * Setup hook — called by server.ts which already creates the Server instance.
 * Attaches auth middleware and connection handler to the provided io instance.
 */
export function setupSocket(instance: Server): void {
  io = instance;

  io.use(authMiddleware);

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    console.log(`[Socket] User connected: ${user?.email ?? 'unknown'} (${socket.id})`);

    if (user?.id) {
      socket.join(`user:${user.id}`);
    }

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] User disconnected: ${user?.email ?? 'unknown'} (${reason})`);
    });
  });

  console.log('[Socket] Socket.io setup complete');
}
