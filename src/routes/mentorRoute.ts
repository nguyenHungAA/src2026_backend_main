import express, { Router } from 'express'
import getMentors from '../controller/getMentors.js'

const router: Router = express.Router();

router.get('/', getMentors);

export default router;
