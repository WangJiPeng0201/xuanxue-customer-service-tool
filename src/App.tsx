import { useEffect, useMemo, useState } from 'react';
import './App.css';

type CustomerStage =
  | 'new_contact'
  | 'free_tarot'
  | 'convert_bazi'
  | 'paid_bazi'
  | 'delivery'
  | 'service_match'
  | 'hesitation'
  | 'closed';

type Topic = 'relationship' | 'wealth' | 'career' | 'health' | 'general';

type Customer = {
  id?: string;
  name: string;
  source: string;
  topic: Topic;
  stage: CustomerStage;
  question: string;
  tarotCards: string;
  birthInfo: string;
  partnerInfo: string;
  paymentStatus: 'unpaid' | 'paid_89' | 'service_paid';
  notes: string;
};

type BrainResult = {
  stage: CustomerStage;
  intent: string;
  psychology: string;
  recommendedAction: string;
  risk: string;
  service: string;
  provider?: string;
  replies: Array<{ label: string; text: string }>;
};

const emptyCustomer: Customer = {
  name: '新客户',
  source: '直播间',
  topic: 'relationship',
  stage: 'new_contact',
  question: '',
  tarotCards: '',
  birthInfo: '',
  partnerInfo: '',
  paymentStatus: 'unpaid',
  notes: '',
};

const stageLabels: Record<CustomerStage, string> = {
  new_contact: '刚加微信',
  free_tarot: '免费塔罗',
  convert_bazi: '转八字',
  paid_bazi: '已付八字',
  delivery: '交付中',
  service_match: '道观服务',
  hesitation: '客户犹豫',
  closed: '收住',
};

const topicLabels: Record<Topic, string> = {
  relationship: '感情',
  wealth: '财运',
  career: '事业',
  health: '健康',
  general: '综合',
};

const actions = [
  ['welcome', '欢迎接缘'],
  ['tarot_tip', '塔罗提点'],
  ['convert_bazi', '转八字'],
  ['opening_judgement', '开盘第一断'],
  ['service_match', '匹配道观服务'],
  ['hesitation', '客户犹豫'],
  ['price_objection', '嫌贵回复'],
  ['close_gently', '收住不追'],
] as const;

function App() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customer, setCustomer] = useState<Customer>(emptyCustomer);
  const [conversation, setConversation] = useState('');
  const [result, setResult] = useState<BrainResult | null>(null);
  const [copied, setCopied] = useState('');
  const [systemStatus, setSystemStatus] = useState<{ aiProvider: string; model: string | null; baseUrl?: string | null } | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void refreshCustomers();
    void refreshSystemStatus();
  }, []);

  const selectedId = customer.id;
  const canSave = customer.name.trim().length > 0;
  const title = useMemo(() => {
    return selectedId ? `客户档案：${customer.name}` : '新客户档案';
  }, [customer.name, selectedId]);

  async function refreshCustomers() {
    const response = await fetch('/api/customers');
    setCustomers(await response.json());
  }

  async function refreshSystemStatus() {
    const response = await fetch('/api/system/status');
    setSystemStatus(await response.json());
  }

  async function saveCustomer() {
    if (!canSave) return;
    setIsSaving(true);
    const response = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer),
    });
    const saved = await response.json();
    setCustomer(saved);
    await refreshCustomers();
    setIsSaving(false);
  }

  async function runBrain(action: (typeof actions)[number][0]) {
    const response = await fetch('/api/brain/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: customer.id,
        customer,
        conversation,
        action,
      }),
    });
    setResult(await response.json());
  }

  async function copyReply(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 1600);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">玄学私域承接工作台</p>
          <h1>大脑调度 + 子窗口执行</h1>
        </div>
        <div className="top-actions">
          <span className="ai-badge">
            {systemStatus?.aiProvider === 'openai' ? `AI：${systemStatus.model}` : 'AI：规则兜底'}
          </span>
          <button className="primary" onClick={() => void saveCustomer()} disabled={!canSave || isSaving}>
            {isSaving ? '保存中' : '保存客户'}
          </button>
        </div>
      </header>

      <section className="workspace">
        <aside className="panel customer-list">
          <div className="panel-head">
            <h2>客户</h2>
            <button className="ghost" onClick={() => setCustomer(emptyCustomer)}>
              新建
            </button>
          </div>
          <div className="list">
            {customers.length === 0 ? (
              <p className="muted">还没有客户。先录入一个，系统会存在本地数据库里。</p>
            ) : (
              customers.map((item) => (
                <button
                  className={item.id === selectedId ? 'list-item active' : 'list-item'}
                  key={item.id}
                  onClick={() => setCustomer(item)}
                >
                  <strong>{item.name}</strong>
                  <span>
                    {topicLabels[item.topic]} · {stageLabels[item.stage]}
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="panel form-panel">
          <div className="panel-head">
            <h2>{title}</h2>
            <span className="status">{stageLabels[customer.stage]}</span>
          </div>

          <div className="form-grid">
            <label>
              客户昵称
              <input value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} />
            </label>
            <label>
              来源
              <input value={customer.source} onChange={(event) => setCustomer({ ...customer, source: event.target.value })} />
            </label>
            <label>
              问题类型
              <select value={customer.topic} onChange={(event) => setCustomer({ ...customer, topic: event.target.value as Topic })}>
                {Object.entries(topicLabels).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              当前阶段
              <select
                value={customer.stage}
                onChange={(event) => setCustomer({ ...customer, stage: event.target.value as CustomerStage })}
              >
                {Object.entries(stageLabels).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              付款状态
              <select
                value={customer.paymentStatus}
                onChange={(event) =>
                  setCustomer({ ...customer, paymentStatus: event.target.value as Customer['paymentStatus'] })
                }
              >
                <option value="unpaid">未付费</option>
                <option value="paid_89">已付 89</option>
                <option value="service_paid">已付服务</option>
              </select>
            </label>
          </div>

          <label>
            客户问题
            <textarea
              value={customer.question}
              onChange={(event) => setCustomer({ ...customer, question: event.target.value })}
              placeholder="例如：和前任还能不能和好？"
            />
          </label>
          <label>
            三张牌 / 直播间信息
            <textarea
              value={customer.tarotCards}
              onChange={(event) => setCustomer({ ...customer, tarotCards: event.target.value })}
              placeholder="例如：圣杯五正位、宝剑二正位、星币六逆位"
            />
          </label>
          <label>
            出生信息
            <textarea
              value={customer.birthInfo}
              onChange={(event) => setCustomer({ ...customer, birthInfo: event.target.value })}
              placeholder="客户本人出生年月日时、出生地"
            />
          </label>
          <label>
            对方信息 / 备注
            <textarea
              value={customer.partnerInfo}
              onChange={(event) => setCustomer({ ...customer, partnerInfo: event.target.value })}
              placeholder="对方生日、关系状态、客户主动补充的信息"
            />
          </label>
        </section>

        <section className="panel brain-panel">
          <div className="panel-head">
            <h2>大脑窗口</h2>
            <span className="status">只筛选，不教育</span>
          </div>

          <label>
            粘贴客户最新对话
            <textarea
              className="conversation"
              value={conversation}
              onChange={(event) => setConversation(event.target.value)}
              placeholder="把客户最近几句微信聊天贴到这里。"
            />
          </label>

          <div className="action-grid">
            {actions.map(([value, label]) => (
              <button key={value} onClick={() => void runBrain(value)}>
                {label}
              </button>
            ))}
          </div>

          {result && (
            <div className="brain-result">
              <div className="insight-grid">
                <Insight title="阶段" text={stageLabels[result.stage]} />
                <Insight title="引擎" text={result.provider === 'openai' ? 'OpenAI API' : '规则兜底'} />
                <Insight title="来意" text={result.intent} />
                <Insight title="心理" text={result.psychology} />
                <Insight title="动作" text={result.recommendedAction} />
                <Insight title="风控" text={result.risk} />
                <Insight title="服务" text={serviceLabel(result.service)} />
              </div>

              <div className="reply-list">
                {result.replies.map((reply) => (
                  <article className="reply" key={reply.label}>
                    <div className="reply-head">
                      <strong>{reply.label}</strong>
                      <button className="copy" onClick={() => void copyReply(reply.text, reply.label)}>
                        {copied === reply.label ? '已复制' : '复制'}
                      </button>
                    </div>
                    <p>{reply.text}</p>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function Insight({ title, text }: { title: string; text: string }) {
  return (
    <div className="insight">
      <span>{title}</span>
      <p>{text}</p>
    </div>
  );
}

function serviceLabel(value: string) {
  const labels: Record<string, string> = {
    birth_lamp: '本命灯',
    wealth_treasury: '补财库',
    harmony: '合和',
    resolve_sha: '化煞',
    consecration: '开光',
    ancestor_or_spirit_settle: '先净先安',
    advice_only: '只给注意事项',
  };
  return labels[value] ?? value;
}

export default App;
