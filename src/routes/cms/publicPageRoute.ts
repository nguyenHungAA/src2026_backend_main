import express, { Router } from 'express';
import {
    getCurrentHomepage,
    getSemesterHomepage,
} from '../../controller/cms/pageController.js';

const router: Router = express.Router();

router.get('/current/homepage', getCurrentHomepage);
router.get('/:semesterSlug/homepage', getSemesterHomepage);

export default router;
