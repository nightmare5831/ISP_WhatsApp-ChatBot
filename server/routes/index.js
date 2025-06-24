import { Router } from 'express';
import botRouter from './service';

const serviceRouter = Router();

serviceRouter.get('/', (req, res) => {
  res.status(200).json({message: 'Welcome to the ISP ChatBot API'});
});
serviceRouter.use('/api', botRouter);

export default serviceRouter;