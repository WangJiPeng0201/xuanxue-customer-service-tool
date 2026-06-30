import type { ServiceKind } from '../types.ts';

export type ServiceConfig = {
  kind: ServiceKind;
  name: string;
  positioning: string;
  delivery: string[];
  priceNote: string;
};

export const serviceCatalog: Record<ServiceKind, ServiceConfig> = {
  birth_lamp: {
    kind: 'birth_lamp',
    name: '本命灯',
    positioning: '运弱、心神不稳、方向不明时，先扶正气、明前路。',
    delivery: ['观内供灯', '回传记录', '注意事项'],
    priceNote: '待后台配置',
  },
  wealth_treasury: {
    kind: 'wealth_treasury',
    name: '补财库',
    positioning: '财库有漏、财来财去、守财弱时，先补漏口，再谈聚财。',
    delivery: ['观内法事', '过程记录', '后续注意事项'],
    priceNote: '待后台配置',
  },
  harmony: {
    kind: 'harmony',
    name: '合和',
    positioning: '感情有牵扯但心结重、冷淡反复时，化冷、怨、堵，助缘缓和。',
    delivery: ['观内合和灯或和合法事', '过程记录', '注意事项'],
    priceNote: '待后台配置',
  },
  resolve_sha: {
    kind: 'resolve_sha',
    name: '化煞',
    positioning: '盘里有冲煞压运、人事反复、阻滞明显时，先化冲再求事。',
    delivery: ['观内法事', '过程记录', '注意事项'],
    priceNote: '待后台配置',
  },
  consecration: {
    kind: 'consecration',
    name: '开光',
    positioning: '物件承接护身、助运、安神用途时，按规矩在观内开光。',
    delivery: ['观内开光', '图片或视频记录', '使用禁忌'],
    priceNote: '待后台配置',
  },
  ancestor_or_spirit_settle: {
    kind: 'ancestor_or_spirit_settle',
    name: '先净先安',
    positioning: '白事、流产、未安之气等情况，先净、先安，再谈财和事。',
    delivery: ['观内净化或安灵相关安排', '过程记录', '注意事项'],
    priceNote: '待后台配置',
  },
  advice_only: {
    kind: 'advice_only',
    name: '只给注意事项',
    positioning: '客户未到服务节点，先筛选，不教育，不追单。',
    delivery: ['文字注意事项'],
    priceNote: '不报价',
  },
};
