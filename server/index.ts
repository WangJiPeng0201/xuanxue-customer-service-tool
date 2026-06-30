import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import { networkInterfaces } from 'node:os';
import { createServer as createViteServer } from 'vite';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { getCustomer, listCustomers, saveInteraction, upsertCustomer } from './db.ts';
import { runBrain } from './brain/rules.ts';
import { enrichWithOpenAI, hasOpenAIConfig } from './ai/openaiClient.ts';
import type { Customer, Topic } from './types.ts';

const app = express();
const port = Number(process.env.PORT ?? 5173);
const host = process.env.HOST ?? '0.0.0.0';

app.use(cors());
app.use(express.json({ limit: '2mb' }));

const customerSchema = z.object({
  id: z.string().optional(),
  name: z.string().default('未命名客户'),
  source: z.string().default('微信'),
  topic: z.enum(['relationship', 'wealth', 'career', 'health', 'general']).default('general'),
  stage: z
    .enum(['new_contact', 'free_tarot', 'convert_bazi', 'paid_bazi', 'delivery', 'service_match', 'hesitation', 'closed'])
    .default('new_contact'),
  question: z.string().default(''),
  tarotCards: z.string().default(''),
  birthInfo: z.string().default(''),
  partnerInfo: z.string().default(''),
  paymentStatus: z.enum(['unpaid', 'paid_89', 'service_paid']).default('unpaid'),
  notes: z.string().default(''),
});

const brainSchema = z.object({
  customerId: z.string().optional(),
  customer: customerSchema.partial().optional(),
  conversation: z.string().default(''),
  action: z.enum([
    'next_reply',
    'welcome',
    'tarot_tip',
    'convert_bazi',
    'opening_judgement',
    'service_match',
    'price_objection',
    'hesitation',
    'close_gently',
  ]),
});

app.get('/api/customers', (_req, res) => {
  res.json(listCustomers());
});

app.get('/api/customers/:id', (req, res) => {
  const customer = getCustomer(req.params.id);
  if (!customer) {
    res.status(404).json({ error: '客户不存在' });
    return;
  }
  res.json(customer);
});

app.post('/api/customers', (req, res) => {
  const parsed = customerSchema.parse(req.body);
  const now = new Date().toISOString();
  const previous = parsed.id ? getCustomer(parsed.id) : undefined;
  const customer: Customer = {
    id: parsed.id ?? uuid(),
    name: parsed.name,
    source: parsed.source,
    topic: parsed.topic as Topic,
    stage: parsed.stage,
    question: parsed.question,
    tarotCards: parsed.tarotCards,
    birthInfo: parsed.birthInfo,
    partnerInfo: parsed.partnerInfo,
    paymentStatus: parsed.paymentStatus,
    notes: parsed.notes,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  };
  res.json(upsertCustomer(customer));
});

app.post('/api/brain/run', (req, res) => {
  void handleBrainRun(req, res);
});

async function handleBrainRun(req: express.Request, res: express.Response) {
  const parsed = brainSchema.parse(req.body);
  const stored = parsed.customerId ? getCustomer(parsed.customerId) : undefined;
  const brainRequest = {
    customer: {
      ...stored,
      ...parsed.customer,
    },
    conversation: parsed.conversation,
    action: parsed.action,
  };
  const baseResult = runBrain(brainRequest);
  let result = baseResult;
  let provider = 'rules';

  if (hasOpenAIConfig()) {
    try {
      result = await enrichWithOpenAI(brainRequest, baseResult);
      provider = 'llm';
    } catch (error) {
      result = {
        ...baseResult,
        risk: `${baseResult.risk} API 暂时不可用，已使用规则兜底。`,
      };
      console.error(error);
    }
  }

  saveInteraction({
    id: uuid(),
    customerId: parsed.customerId,
    action: parsed.action,
    conversation: parsed.conversation,
    resultJson: JSON.stringify({ provider, result }),
    createdAt: new Date().toISOString(),
  });

  res.json({ ...result, provider });
}

app.get('/api/system/status', (_req, res) => {
  res.json({
    aiProvider: hasOpenAIConfig() ? 'llm' : 'rules',
    model: process.env.OPENAI_MODEL || process.env.LLM_MODEL || null,
    baseUrl: process.env.OPENAI_BASE_URL || process.env.LLM_BASE_URL || null,
    wireApi: process.env.OPENAI_WIRE_API || process.env.LLM_WIRE_API || 'chat',
  });
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static('dist'));
} else {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(port, host, () => {
  console.log(`玄学私域承接工作台已启动：http://localhost:${port}`);
  for (const address of getLanAddresses()) {
    console.log(`局域网访问地址：http://${address}:${port}`);
  }
});

function getLanAddresses() {
  return Object.values(networkInterfaces())
    .flatMap((items) => items ?? [])
    .filter((item) => item.family === 'IPv4' && !item.internal)
    .map((item) => item.address);
}
