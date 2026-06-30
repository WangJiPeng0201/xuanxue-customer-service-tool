export type CustomerStage =
  | 'new_contact'
  | 'free_tarot'
  | 'convert_bazi'
  | 'paid_bazi'
  | 'delivery'
  | 'service_match'
  | 'hesitation'
  | 'closed';

export type Topic = 'relationship' | 'wealth' | 'career' | 'health' | 'general';

export type ServiceKind =
  | 'birth_lamp'
  | 'wealth_treasury'
  | 'harmony'
  | 'resolve_sha'
  | 'consecration'
  | 'ancestor_or_spirit_settle'
  | 'advice_only';

export type Customer = {
  id: string;
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
  createdAt: string;
  updatedAt: string;
};

export type BrainRequest = {
  customer?: Partial<Customer>;
  conversation: string;
  action:
    | 'next_reply'
    | 'welcome'
    | 'tarot_tip'
    | 'convert_bazi'
    | 'opening_judgement'
    | 'service_match'
    | 'price_objection'
    | 'hesitation'
    | 'close_gently';
};

export type BrainResult = {
  stage: CustomerStage;
  intent: string;
  psychology: string;
  recommendedAction: string;
  risk: string;
  service: ServiceKind;
  replies: Array<{
    label: string;
    text: string;
  }>;
};
