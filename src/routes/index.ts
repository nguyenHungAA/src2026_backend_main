import { Router } from "express";
import publicationRouter from "./publicationRoute.js";
import mentorRouter from "./mentorRoute.js";
import newsRouter from "./newsRoute.js";
import authRouter from "./authRoute.js";
import pageContentRouter from "./pageContentRoute.js";

const router: Router = Router();

router.use('/publication', publicationRouter);
router.use('/mentor', mentorRouter);
router.use('/news', newsRouter);
router.use('/auth', authRouter);
router.use('/content', pageContentRouter);

export default router;