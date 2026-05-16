import express, { type Express } from 'express';
import cors from 'cors';
import { threadsRouter } from './routes/threads';
import { messagesRouter } from './routes/messages';
import { plansRouter } from './routes/plans';
import { captureRouter } from './routes/capture';
import { coursePlansRouter } from './routes/course-plans';
import { weeklyReportRouter } from './routes/weekly-report';
import { auditRouter } from './routes/audit';
import { agentsRouter } from './routes/agents';
import { familyMembersRouter } from './routes/family-members';
import { assignmentsRouter } from './routes/assignments';
import { familyMemoryRouter, familyStatusRouter } from './routes/family-memory';
import { agentTasksRouter, agentOutputsRouter } from './routes/agent-tasks';

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'hearthos-api' });
  });

  app.use('/api/threads', threadsRouter);
  app.use('/api/threads', messagesRouter);
  app.use('/api/plans', plansRouter);
  app.use('/api/capture', captureRouter);
  app.use('/api/course-plans', coursePlansRouter);
  app.use('/api/weekly-report', weeklyReportRouter);
  app.use('/api/audit', auditRouter);
  app.use('/api/agents', agentsRouter);
  app.use('/api/family', familyMembersRouter);
  app.use('/api/assignments', assignmentsRouter);
  app.use('/api/family-memory', familyMemoryRouter);
  app.use('/api/family-status', familyStatusRouter);
  app.use('/api/agents', agentTasksRouter);
  app.use('/api/agent-outputs', agentOutputsRouter);

  return app;
}
