import express from 'express';
import cors from 'cors';
import serviceRouter from './routes';
import serverless from 'serverless-http';
import dotenv from 'dotenv';
dotenv.config();

const app = express();

app.use(cors());

app.use(
  express.urlencoded({
    extended: false
  })
);

app.use(express.json());
app.use(serviceRouter);

app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    errors: {
      message: err.message
    }
  });
});

export default serverless(app);