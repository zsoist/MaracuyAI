export interface GuideSection {
  id: string;
  icon: string;
  title: string;
  summary: string;
  bullets: string[];
  tone?: 'info' | 'tip' | 'risk' | 'emergency';
}

export interface VocalizationRef {
  id: string;
  name: string;
  icon: string;
  description: string;
  sound: string;
  mood: string;
  action: string;
}

export interface HealthCheckItem {
  id: string;
  icon: string;
  label: string;
  healthy: string;
  warning: string;
}

export interface GuideContent {
  heroTitle: string;
  heroSubtitle: string;
  sections: GuideSection[];
  vocalizationGuide: {
    title: string;
    subtitle: string;
    items: VocalizationRef[];
  };
  healthChecklist: {
    title: string;
    subtitle: string;
    items: HealthCheckItem[];
  };
  emergencySigns: {
    title: string;
    subtitle: string;
    signs: string[];
    action: string;
  };
  howToTitle: string;
  howToSteps: string[];
  safetyNote: string;
}
