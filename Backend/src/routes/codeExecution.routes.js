import { Router } from 'express';
import {
    createCodeExecutionJob,
    getCodeExecutionJobStatus,
    listSupportedExecutionLanguages,
} from '../controllers/codeExecution.controller.js';

const router = Router();

router.get('/languages', listSupportedExecutionLanguages);
router.post('/jobs', createCodeExecutionJob);
router.get('/jobs/:jobId', getCodeExecutionJobStatus);

export default router;
