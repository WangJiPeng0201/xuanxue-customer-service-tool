import type { BrainRequest, BrainResult, CustomerStage, ServiceKind, Topic } from '../types.ts';

const topicKeywords: Array<[Topic, RegExp]> = [
  ['relationship', /前任|复合|感情|婚|恋|他|她|对象|桃花|分手|和好|姻缘/],
  ['wealth', /财|钱|亏|债|买房|事业.*钱|收入|存不住|财库|破财/],
  ['career', /事业|工作|贵人|小人|升职|生意|项目|客户|合作/],
  ['health', /健康|身体|睡|焦虑|病|医院|气血|心神/],
];

const pressureWords = /诅咒|完了|必须|一定|翻不了身|出大事|死|绝对|保证/;

export function runBrain(request: BrainRequest): BrainResult {
  const conversation = request.conversation.trim();
  const topic = request.customer?.topic ?? detectTopic(conversation);
  const stage = detectStage(request, conversation);
  const service = matchService(topic, conversation, stage);
  const intent = inferIntent(topic, conversation);
  const psychology = inferPsychology(topic, stage);
  const risk = pressureWords.test(conversation)
    ? '客户语境里已经有强压力词，回复要收一点，避免继续加重恐惧。'
    : '保持短句，一句一停；只筛选，不教育。';

  return {
    stage,
    intent,
    psychology,
    recommendedAction: recommendAction(stage, service),
    risk,
    service,
    replies: buildReplies(request.action, stage, topic, service),
  };
}

function detectTopic(text: string): Topic {
  return topicKeywords.find(([, pattern]) => pattern.test(text))?.[0] ?? 'general';
}

function detectStage(request: BrainRequest, text: string): CustomerStage {
  if (request.action === 'welcome') return 'new_contact';
  if (request.action === 'tarot_tip') return 'free_tarot';
  if (request.action === 'convert_bazi') return 'convert_bazi';
  if (request.action === 'opening_judgement') return 'paid_bazi';
  if (request.action === 'service_match') return 'service_match';
  if (request.action === 'hesitation' || /想想|考虑|有点贵|没钱|怕|担心|靠谱吗/.test(text)) return 'hesitation';
  if (request.customer?.paymentStatus === 'paid_89') return 'paid_bazi';
  if (/三张牌|塔罗|正位|逆位|牌/.test(text)) return 'free_tarot';
  if (/八字|出生|时辰|生日|出生地|细排/.test(text)) return 'convert_bazi';
  if (/怎么处理|怎么改善|做什么|法事|供灯|补财库|化煞|开光|合和/.test(text)) return 'service_match';
  return request.customer?.stage ?? 'new_contact';
}

function matchService(topic: Topic, text: string, stage: CustomerStage): ServiceKind {
  if (stage !== 'service_match' && !/处理|改善|供灯|法事|开光|补|化/.test(text)) return 'advice_only';
  if (/白事|火葬|坟|流产|打胎|阴|未安|超度/.test(text)) return 'ancestor_or_spirit_settle';
  if (/财|钱|亏|债|财库|存不住|破财/.test(text) || topic === 'wealth') return 'wealth_treasury';
  if (/复合|和好|感情|婚|姻缘|前任|分手/.test(text) || topic === 'relationship') return 'harmony';
  if (/小人|冲煞|犯冲|煞/.test(text)) return 'resolve_sha';
  if (/心神|睡|迷茫|运弱|低迷/.test(text)) return 'birth_lamp';
  return 'birth_lamp';
}

function inferIntent(topic: Topic, text: string): string {
  if (topic === 'relationship') {
    return /别人|有人|追/.test(text)
      ? '客户想确认对方是否已经转向别人，同时还想知道自己有没有争取窗口。'
      : '客户表面问结果，底层是在确认对方是否还惦记，以及自己值不值得继续等。';
  }
  if (topic === 'wealth') return '客户想知道自己为什么努力但留不住钱，以及有没有翻身的路。';
  if (topic === 'career') return '客户想确认当前阻力来自能力、时运，还是身边人事消耗。';
  if (topic === 'health') return '客户想先稳住心神和状态，不适合上来推重方案。';
  return text ? '客户还在试探，需要先接缘和筛选，不急着教育。' : '客户信息不足，先接缘取关键信息。';
}

function inferPsychology(topic: Topic, stage: CustomerStage): string {
  if (stage === 'hesitation') return '客户有意愿，但怕花钱后没有结果。需要收住，不追着说服。';
  if (topic === 'relationship') return '客户容易怕被判死局，要先让她感觉被看见，再谈八字或处理。';
  if (topic === 'wealth') return '客户对亏损和债务敏感，适合说“本命不差，阶段被冲”，不要压到绝望。';
  return '客户还没有完全交出信任，回复要短，等反馈。';
}

function recommendAction(stage: CustomerStage, service: ServiceKind): string {
  if (stage === 'new_contact') return '先接缘，让客户补发问题和直播间信息。';
  if (stage === 'free_tarot') return '给一段免费提点，只讲趋势和体感，看到不浅再转八字。';
  if (stage === 'convert_bazi') return '说明细排八字属于正式咨询，报价清楚，不做长篇解释。';
  if (stage === 'paid_bazi') return '先开盘第一断立信，再等客户反馈。';
  if (stage === 'service_match') return service === 'advice_only' ? '只给注意事项，暂不推服务。' : '按盘推荐道观服务，说清楚不强求。';
  if (stage === 'hesitation') return '降低压力，确认量力而行，有缘再做。';
  return '收住，不继续追。';
}

function buildReplies(
  action: BrainRequest['action'],
  stage: CustomerStage,
  topic: Topic,
  service: ServiceKind,
): BrainResult['replies'] {
  if (action === 'welcome' || stage === 'new_contact') {
    return [
      {
        label: '接缘欢迎',
        text: '缘友，我是净清师兄这边，刚才人比较多，让你久等了。你把直播间问的问题和三张牌再发我一下，我先给你简单看一眼。',
      },
      {
        label: '更短',
        text: '缘友，久等了。你把刚才的问题和三张牌发我，我先给你简单提点一下。',
      },
    ];
  }

  if (action === 'tarot_tip' || stage === 'free_tarot') {
    return relationshipTarotReplies();
  }

  if (action === 'convert_bazi' || stage === 'convert_bazi') {
    return [
      {
        label: '转八字',
        text: '你这个事不是单纯问一个结果，里面有一层卡住的东西。塔罗只能看当下气场，要看根，还是要回到八字细排。',
      },
      {
        label: '报价',
        text: '细排八字就不是直播间免费提点了，属于正式咨询。基础挂金 89，一次大概 30 分钟，最多围绕三个问题来看。你确认，我就给你排。',
      },
    ];
  }

  if (action === 'opening_judgement' || stage === 'paid_bazi') {
    return openingReplies(topic);
  }

  if (action === 'service_match' || stage === 'service_match') {
    return serviceReplies(service);
  }

  if (action === 'price_objection') {
    return [
      {
        label: '嫌贵',
        text: '理解，这个不是必须消费的东西，量力而行。你先按我说的注意事项去避，后面有心处理再来找师傅。',
      },
    ];
  }

  if (action === 'hesitation' || stage === 'hesitation') {
    return [
      {
        label: '不强求',
        text: '没事，法事不强求。你自己有感觉、有心处理再做。师傅这边只按缘分接，不追着你做决定。',
      },
      {
        label: '怕没结果',
        text: '这个我也跟你讲清楚，法事是助缘、调气、化阻，不是替人保证结果。能接受这个，再做；接受不了，就先不用勉强。',
      },
    ];
  }

  return [
    {
      label: '收住',
      text: '缘友，这个先不急。你自己有感觉再往下看，没感觉就先放一放，不用勉强。',
    },
  ];
}

function relationshipTarotReplies(): BrainResult['replies'] {
  return [
    {
      label: '免费提点',
      text: '这三张牌看下来，不是完全断干净的缘分，里面还有遗憾和没放下。但现在两个人都拧着，谁也不愿意先把话说透。',
    },
    {
      label: '师傅味',
      text: '我看这个牌，不是无缘，是缘里有堵。你们之间还有牵扯，但现在心结重，话没说开，心也没真正放下。',
    },
    {
      label: '留转化',
      text: '后面不是没有联系回来的机会，但就算回来，也容易一边热一边冷。你这个要看根，得看两个人八字里这个缘到底怎么走。',
    },
  ];
}

function openingReplies(topic: Topic): BrainResult['replies'] {
  if (topic === 'wealth') {
    return [
      {
        label: '财运第一断',
        text: '我先跟你讲重点，你这个盘不是没财。反而是命里有财气，只是这几年财来得辛苦，留得费劲，容易左手进右手出。',
      },
      {
        label: '等反馈',
        text: '你自己对照一下，是不是从 2022 年以后，这种忙、耗、存不住的感觉更明显？',
      },
    ];
  }
  if (topic === 'career') {
    return [
      {
        label: '事业第一断',
        text: '你这个盘不是没能力，是这阶段人事消耗比较重。做了不少，但结果不聚，容易有人和事拖住你。',
      },
    ];
  }
  return [
    {
      label: '感情第一断',
      text: '我看了你们这个盘，你们前面相处其实都挺累。这段关系不是没牵扯，但里面有耗，你委屈也不少。',
    },
    {
      label: '对方状态',
      text: '对方不是完全无情，但落地和承诺慢，容易有试探、有回温，就是不一定马上给你稳定态度。',
    },
  ];
}

function serviceReplies(service: ServiceKind): BrainResult['replies'] {
  if (service === 'wealth_treasury') {
    return [
      {
        label: '补财库',
        text: '你这个主要不是没财，是财库有漏、财气不聚。要处理的话，可以在观里按你的生辰先化冲，再补财库。先把漏口补住，后面财才有地方安住。',
      },
    ];
  }
  if (service === 'harmony') {
    return [
      {
        label: '合和',
        text: '你们这个不是完全没缘，是缘分被耗住了。要处理的话，可以在观里按两个人生辰做合和灯，先化两个人之间的冷、怨、堵，让关系有缓和的机会。',
      },
    ];
  }
  if (service === 'ancestor_or_spirit_settle') {
    return [
      {
        label: '先净先安',
        text: '民俗里讲，财不入脏门。这个不是说人不好，是气场里有未安之事，财气不容易聚。你这种要先净、先安，再谈补财或求事。',
      },
    ];
  }
  if (service === 'resolve_sha') {
    return [
      {
        label: '化煞',
        text: '盘里有冲煞压运的象。这个不是说你命差，是阶段被冲住了。要处理就按生辰在观里化冲煞，把压着的地方先松开。',
      },
    ];
  }
  return [
    {
      label: '供本命灯',
      text: '你这个情况先不建议做太重的法事。可以先以你的生辰为引，在观里供一盏本命灯。灯主光明，也主引路，先把气场和心神扶起来。',
    },
  ];
}
