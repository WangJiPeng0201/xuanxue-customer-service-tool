# 玄学私域承接工作台

这是给同事使用的本地工作台，不直接接个人微信接口。当前版本采用“来回复制粘贴”：

1. 同事把客户微信对话粘贴进“大脑窗口”。
2. 系统判断客户阶段、真实来意、心理状态、推荐动作和风控点。
3. 系统生成 1-3 条可复制回复。
4. 同事选择一条，稍微改动后发回微信。
5. 客户档案和生成记录会保存在本地 SQLite 数据库。

## 运行

```bash
npm run dev
```

打开：

```text
http://localhost:5173
```

## 接入模型 API

复制环境变量示例：

```bash
cp .env.example .env
```

然后在 `.env` 里填入：

```text
OPENAI_API_KEY=你的服务商 API Key
OPENAI_BASE_URL=服务商的 OpenAI 兼容地址
OPENAI_MODEL=模型名称
```

例如 DeepSeek：

```text
OPENAI_API_KEY=你的 DeepSeek Key
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_MODEL=deepseek-chat
```

例如 FreeModel 这类 OpenAI 兼容中转：

```text
OPENAI_API_KEY=你的 FreeModel Key
OPENAI_BASE_URL=https://api.freemodel.dev
OPENAI_MODEL=gpt-5.5
OPENAI_WIRE_API=responses
```

如果后台显示你可使用 VIP SG 线路：

```text
OPENAI_API_KEY=你的 FreeModel Key
OPENAI_BASE_URL=https://vip-sg.freemodel.dev
OPENAI_MODEL=gpt-5.5
OPENAI_WIRE_API=responses
```

如果没有配置 Key，系统会自动使用规则兜底。

## 当前模块

- `server/index.ts`：本地服务入口，负责 API 和页面托管。
- `server/db.ts`：本地 SQLite 数据库，保存客户档案和生成记录。
- `server/brain/rules.ts`：第一版规则大脑，负责阶段判断、来意判断、服务匹配和话术生成。
- `server/ai/openaiClient.ts`：OpenAI API 子脑，有 Key 时负责生成更自然的微信回复。
- `server/config/methodology.ts`：你的玄学私域承接方法论摘要，AI 子脑会读取这里。
- `server/config/serviceCatalog.ts`：道观服务配置入口，后续价格、交付项、服务说明可从这里扩展到后台。
- `src/App.tsx`：工作台页面，包含客户列表、客户档案、大脑窗口、可复制回复。

## 当前原则

- 只筛选，不教育。
- 一句一停，等客户反馈。
- 客户已告知的信息，不包装成“盘里看出来”。
- 不生成保证结果的话术。
- 保留师傅味和民俗味，弱化极端恐吓。
- 道观服务按盘匹配，不给所有客户推同一个项目。

## 后续优先级

1. 服务价格后台配置。
2. 同事账号和权限。
3. 客户互动记录可视化。
4. 话术效果复盘统计。
5. 接入大模型 API，让规则大脑调度 AI 子模块。
