const dotenv = require('dotenv');
const mongoose = require('mongoose');
dotenv.config({ path: './config.env' });


// This handles uncaught syncronous exceptions
// Must be at the beginning for it yo be already
// subscribed to the event before the exception is thrown
process.on('uncaughtException', err => {
  console.log('UNCAUGHT EXECPTION! 💥 Shutting down...');
  console.log(err);
  // Wait for the server to finish pending requests and close it
  // Jonas says that it is not necessary to close the server
  // because the process is going to terminate anyway
  // I'm leaving it here just in case as commented lines

  // server.close(() => {
  process.exit(1)
  // });
})

const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);
mongoose.connect(DB, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useFindAndModify: false,
  useUnifiedTopology: true,
}).then(() => { console.log('DB connection successful!') });


const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

// Every time there is an unhandled rejection, the process 
// object emits an event called unhandledRejection.
// Here we are listening for this event and handling
// the unhandled rejection 
// This handles uncaught syncronous exceptions
process.on('unhandledRejection', err => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err);
  // Wait for the server to finish pending requests and close it
  server.close(() => {
    process.exit(1)
  });
});