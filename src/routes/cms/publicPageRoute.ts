import express, { Router } from 'express';
import {
    getCurrentHomepage,
    getSemesterHomepage,
} from '../../controller/cms/pageController.js';
import { publicCache } from '../../middleware/httpPolicy.js';

const router: Router = express.Router();

router.get('/current/homepage', publicCache(), getCurrentHomepage);
router.get('/:semesterSlug/homepage', publicCache(), getSemesterHomepage);

export default router;
