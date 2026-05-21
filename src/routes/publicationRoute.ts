import express, { Router } from 'express'
import submitPublication from '../controller/submitPublication.js'

const router: Router = express.Router();

router.post('/submit', submitPublication);

export default router;