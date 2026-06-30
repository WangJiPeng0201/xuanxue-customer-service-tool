import type { BrainRequest, BrainResult } from '../types.ts';
import { methodologyPrompt } from '../config/methodology.ts';

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export function hasOpenAIConfig() {
  return Boolean(process.env.OPENAI_API_KEY || process.env.LLM_API_KEY);
}

export async function enrichWithOpenAI(request: BrainRequest, base: BrainResult): Promise<BrainResult> {
  if (!hasOpenAIConfig()) return base;

  const model = process.env.OPENAI_MODEL || process.env.LLM_MODEL || 'deepseek-chat';
  const baseUrl = process.env.OPENAI_BASE_URL || process.env.LLM_BASE_URL || 'https://api.deepseek.com';
  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
  const wireApi = process.env.OPENAI_WIRE_API || process.env.LLM_WIRE_API || 'chat';
  const userPayload = JSON.stringify(
    {
      action: request.action,
      customer: request.customer ?? {},
      conversation: request.conversation,
      baseJudgement: base,
    },
    null,
    2,
  );

  const response =
    wireApi === 'responses'
      ? await callResponsesApi({ apiKey, baseUrl, model, userPayload })
      : await callChatCompletionsApi({ apiKey, baseUrl, model, userPayload });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`模型 API 调用失败：${response.status} ${detail}`);
  }

  const data = (await response.json()) as OpenAIResponse & ChatCompletionResponse;
  const text = extractOutputText(data);
  const parsed = parseModelJson(text) as Pick<BrainResult, 'intent' | 'psychology' | 'recommendedAction' | 'risk' | 'replies'>;

  return {
    ...base,
    ...parsed,
    replies: sanitizeReplies(parsed.replies, base.replies),
  };
}

function callChatCompletionsApi(input: { apiKey?: string; baseUrl: string; model: string; userPayload: string }) {
  const endpoint = `${normalizeV1BaseUrl(input.baseUrl)}/chat/completions`;
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: input.model,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(),
        },
        {
          role: 'user',
          content: input.userPayload,
        },
      ],
      response_format: { type: 'json_object' },
    }),
  });
}

function callResponsesApi(input: { apiKey?: string; baseUrl: string; model: string; userPayload: string }) {
  const endpoint = `${normalizeV1BaseUrl(input.baseUrl)}/responses`;
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: input.model,
      input: [
        {
          role: 'system',
          content: buildSystemPrompt(),
        },
        {
          role: 'user',
          content: input.userPayload,
        },
      ],
    }),
  });
}

function normalizeV1BaseUrl(baseUrl: string) {
  const clean = baseUrl.replace(/\/$/, '');
  return clean.endsWith('/v1') ? clean : `${clean}/v1`;
}

function extractOutputText(data: OpenAIResponse & ChatCompletionResponse) {
  const chatText = data.choices?.[0]?.message?.content;
  if (chatText) return chatText;
  if (data.output_text) return data.output_text;
  const text = data.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .filter(Boolean)
    .join('\n');
  if (!text) throw new Error('OpenAI API 没有返回文本。');
  return text;
}

function parseModelJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('模型没有返回可解析的 JSON。');
    return JSON.parse(match[0]);
  }
}

function sanitizeReplies(
  replies: Array<{ label: string; text: string }>,
  fallback: Array<{ label: string; text: string }>,
) {
  const banned = /一定|保证|必须|不做就|完了|诅咒|百分百|马上发财|必复合/;
  const usable = replies
    .map((reply) => ({
      label: reply.label.slice(0, 12) || '回复',
      text: reply.text.trim(),
    }))
    .filter((reply) => reply.text && !banned.test(reply.text))
    .slice(0, 3);
  return usable.length > 0 ? usable : fallback;
}

function buildSystemPrompt() {
  return [
    '你是“玄学私域承接工作台”的话术子脑，服务对象是师傅的同事，不直接面对客户。',
    methodologyPrompt,
    '目标：根据规则大脑给出的阶段、来意、心理和服务建议，生成可复制到微信里的短回复。',
    '总原则：只筛选，不教育；一句一停，等客户反馈；保留师傅味、民俗味、命理压场感；弱化极端恐吓。',
    '不能做：不能保证结果，不能说一定复合、一定发财、百分百有效；不能使用“被诅咒上身”“不做就完了”等强恐吓。',
    '不能把客户已经说过的信息包装成“盘里看出来”。',
    '可以使用：缘友、师傅、从盘上看、本命不是差、阶段被冲、财库有漏、财不入脏门、供灯、化煞、补财库、合和等体系语言。',
    '回复要像微信真人消息，每条 1 到 3 句，不写长篇科普。',
    '输出必须是 JSON 对象，字段为 intent、psychology、recommendedAction、risk、replies。replies 是数组，每项有 label 和 text。',
  ].join('\n');
}
