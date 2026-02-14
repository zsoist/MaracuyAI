export interface GuideSection {
  id: string;
  title: string;
  summary: string;
  bullets: string[];
  tone?: 'info' | 'tip' | 'risk';
}

export interface GuideContent {
  heroTitle: string;
  heroSubtitle: string;
  sections: GuideSection[];
  howToTitle: string;
  howToSteps: string[];
  safetyNote: string;
}
