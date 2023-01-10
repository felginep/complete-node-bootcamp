const mongoose = require('mongoose');
const dotEnv = require('dotenv');

process.on('uncaughtException', (err) => {
  console.log(`🚨 Uncaught exception: ${err.name} ${err.message}`);
  console.log('Shutting down...');
  process.exit(1);
});

dotEnv.config({ path: './config.env' });

const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => console.log('DB connection successful'));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

process.on('unhandledRejection', (err) => {
  console.log(`🚨 Unhandled rejection: ${err.name}`);
  console.log('Shutting down...');
  server.close(() => {
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  console.log('❌ SIGTERM received. Shutting down gracefully');
  server.close(() => {
    console.log('❌ Process terminated');
  });
});
