import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Customer } from './types.ts';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dataDir = join(root, 'data');
mkdirSync(dataDir, { recursive: true });

export const db = new Database(join(dataDir, 'workbench.sqlite'));

db.pragma('journal_mode = WAL');

db.exec(`
  create table if not exists customers (
    id text primary key,
    name text not null,
    source text not null,
    topic text not null,
    stage text not null,
    question text not null,
    tarotCards text not null,
    birthInfo text not null,
    partnerInfo text not null,
    paymentStatus text not null,
    notes text not null,
    createdAt text not null,
    updatedAt text not null
  );

  create table if not exists interactions (
    id text primary key,
    customerId text,
    action text not null,
    conversation text not null,
    resultJson text not null,
    createdAt text not null
  );
`);

const customerColumns =
  'id, name, source, topic, stage, question, tarotCards, birthInfo, partnerInfo, paymentStatus, notes, createdAt, updatedAt';

export function listCustomers(): Customer[] {
  return db.prepare(`select ${customerColumns} from customers order by updatedAt desc`).all() as Customer[];
}

export function getCustomer(id: string): Customer | undefined {
  return db.prepare(`select ${customerColumns} from customers where id = ?`).get(id) as Customer | undefined;
}

export function upsertCustomer(customer: Customer): Customer {
  db.prepare(`
    insert into customers (${customerColumns})
    values (@id, @name, @source, @topic, @stage, @question, @tarotCards, @birthInfo, @partnerInfo, @paymentStatus, @notes, @createdAt, @updatedAt)
    on conflict(id) do update set
      name = excluded.name,
      source = excluded.source,
      topic = excluded.topic,
      stage = excluded.stage,
      question = excluded.question,
      tarotCards = excluded.tarotCards,
      birthInfo = excluded.birthInfo,
      partnerInfo = excluded.partnerInfo,
      paymentStatus = excluded.paymentStatus,
      notes = excluded.notes,
      updatedAt = excluded.updatedAt
  `).run(customer);
  return customer;
}

export function saveInteraction(input: {
  id: string;
  customerId?: string;
  action: string;
  conversation: string;
  resultJson: string;
  createdAt: string;
}) {
  db.prepare(`
    insert into interactions (id, customerId, action, conversation, resultJson, createdAt)
    values (@id, @customerId, @action, @conversation, @resultJson, @createdAt)
  `).run({
    ...input,
    customerId: input.customerId ?? null,
  });
}
