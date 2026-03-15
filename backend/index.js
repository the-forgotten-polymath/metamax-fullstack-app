require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const { validateUrl } = require('./utils/validateUrl');
const { normalizeUrl } = require('./utils/normalizeUrl');
const { urlCache } = require('./utils/cache');
const { createSteps, runAuditPipeline } = require('./audit/pipeline');

const app = express();
const jobs = new Map();

const port = Number(process.env.PORT || 3001);
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000,http://127.0.0.1:3000';
const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 3600000);
const rateLimitMax = Number(process.env.RATE_LIMIT_MAX || 5);
const host = process.env.HOST || '0.0.0.0';

const allowedOrigins = frontendOrigin.split(',').map((origin) => origin.trim());

app.use(
  cors({
    origin:
      frontendOrigin === '*'
        ? true
        : (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
              return callback(null, true);
            }

            return callback(new Error(`CORS blocked origin: ${origin}`));
          },
  })
);
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'metamax-backend' });
});

const auditStartLimiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many audit requests. Please try again later.' },
});

app.post('/audit', auditStartLimiter, async (req, res) => {
  try {
    const { url, force = false } = req.body || {};
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'A valid url is required.' });
    }

    const safeUrl = await validateUrl(url);
    const normalizedUrl = normalizeUrl(safeUrl);

    if (!force) {
      const cached = urlCache.get(normalizedUrl);
      if (cached) {
        const cachedJobId = uuidv4();
        jobs.set(cachedJobId, {
          jobId: cachedJobId,
          status: 'done',
          meta: { ...cached.meta, cachedResult: true },
          steps: createSteps().map((step) => ({ ...step, status: 'done' })),
          data: cached.data,
        });
        return res.json({ jobId: cachedJobId, status: 'done' });
      }
    }

    const jobId = uuidv4();
    const job = {
      jobId,
      status: 'processing',
      steps: createSteps(),
      data: null,
      meta: null,
    };

    jobs.set(jobId, job);

    runAuditPipeline(job, normalizedUrl).catch((error) => {
      job.status = 'error';
      job.error = error.message || 'Audit failed.';
      job.steps = job.steps.map((step) =>
        step.status === 'done' ? step : { ...step, status: 'pending' }
      );
    });

    return res.json({ jobId, status: 'processing' });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to start audit.' });
  }
});

app.get('/audit/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found.' });
  }

  return res.json({
    jobId: job.jobId,
    status: job.status,
    meta: job.status === 'done' ? job.meta : undefined,
    steps: job.steps,
    data: job.status === 'done' ? job.data : null,
    error: job.status === 'error' ? job.error : undefined,
  });
});

const server = app
  .listen(port, host, () => {
    console.log(`Metamax backend listening on http://${host}:${port}`);
  })
  .on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Metamax backend could not start: ${host}:${port} is already in use.`);
    } else {
      console.error(`Metamax backend failed to listen on ${host}:${port}:`, error);
    }

    process.exit(1);
  });

server.ref();
