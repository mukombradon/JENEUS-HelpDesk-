import dotenv from 'dotenv';
dotenv.config();

const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'access-secret-dev',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-dev',
    accessExpiry: '15m',
    refreshExpiry: '7d',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@jeneus.com',
  },

  s3: {
    bucket: process.env.S3_BUCKET || 'jeneus-uploads',
    region: process.env.S3_REGION || 'us-east-1',
    accessKey: process.env.S3_ACCESS_KEY || '',
    secretKey: process.env.S3_SECRET_KEY || '',
    endpoint: process.env.S3_ENDPOINT || '',
  },

  app: {
    slaCheckInterval: parseInt(process.env.SLA_CHECK_INTERVAL || '5', 10),
    recurrenceWindowDays: parseInt(process.env.RECURRENCE_WINDOW_DAYS || '30', 10),
    recurrenceThreshold: parseInt(process.env.RECURRENCE_THRESHOLD || '3', 10),
    reopenWindowDays: parseInt(process.env.REOPEN_WINDOW_DAYS || '5', 10),
  },
};

export default config;
