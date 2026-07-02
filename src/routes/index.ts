import { Router } from "express";
import publicationRouter from "./publicationRoute.js";
import mentorRouter from "./mentorRoute.js";
import newsRouter from "./newsRoute.js";
import authRouter from "./authRoute.js";
import pageContentRouter from "./pageContentRoute.js";
import semesterRouter from "./cms/semesterRoute.js";
import pageRouter from "./cms/pageRoute.js";
import publicPageRouter from "./cms/publicPageRoute.js";
import mediaRouter from "./cms/mediaRoute.js";
import auditLogRouter from "./cms/auditLogRoute.js";

const router: Router = Router();

router.use('/publication', publicationRouter);
router.use('/mentor', mentorRouter);
router.use('/news', newsRouter);
router.use('/auth', authRouter);
router.use('/content', pageContentRouter);
router.use('/admin/semesters', semesterRouter);
router.use('/admin/pages', pageRouter);
router.use('/admin/media', mediaRouter);
router.use('/admin/audit-logs', auditLogRouter);
router.use('/pages', publicPageRouter);

export default router;
