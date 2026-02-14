import type { GuideContent } from './types';

export const guideEn: GuideContent = {
  heroTitle: 'Australian Budgerigar Guide',
  heroSubtitle: 'Practical care guidance, warning signs, and smart routines for daily wellbeing.',
  sections: [
    {
      id: 'species',
      title: 'Species info',
      summary: 'Australian budgerigars are social, intelligent parrots that thrive with routine and interaction.',
      bullets: [
        'Average lifespan is often 7-12 years with good care.',
        'They need social stimulation every day, not only food and water.',
        'Weight, voice changes, and posture are key early wellbeing indicators.',
      ],
      tone: 'info',
    },
    {
      id: 'history',
      title: 'History and behavior context',
      summary: 'Budgerigars evolved in Australian grasslands and are adapted to flock communication patterns.',
      bullets: [
        'Frequent chirping can be normal flock-style communication.',
        'Sudden silence can signal stress, fear, or possible discomfort.',
        'Predictable light/dark cycles strongly influence behavior stability.',
      ],
      tone: 'info',
    },
    {
      id: 'care',
      title: 'Daily care essentials',
      summary: 'Good fundamentals reduce most avoidable risk conditions.',
      bullets: [
        'Provide clean water daily and monitor food leftovers.',
        'Offer safe enrichment (perches, toys, foraging opportunities).',
        'Keep ambient temperature stable and avoid direct drafts.',
      ],
      tone: 'tip',
    },
    {
      id: 'tips',
      title: 'Care tips',
      summary: 'Small habits create better long-term outcomes.',
      bullets: [
        'Use a simple weekly routine: cleaning, toy rotation, behavior notes.',
        'Record short voice baselines in calm moments for comparison.',
        'Track appetite and sleep rhythm together with vocal patterns.',
      ],
      tone: 'tip',
    },
    {
      id: 'risks',
      title: 'Main risks',
      summary: 'These risk categories deserve quick attention.',
      bullets: [
        'Air quality issues (smoke, aerosols, poor ventilation).',
        'Thermal stress from heat spikes or cold drafts.',
        'Chronic stress from noise, predators, or unstable routine.',
      ],
      tone: 'risk',
    },
    {
      id: 'signs',
      title: 'Common warning signs',
      summary: 'Watch for clusters of signs instead of a single event.',
      bullets: [
        'Sustained low activity with reduced vocalization.',
        'Breathing effort changes or persistent tail bobbing.',
        'Loss of appetite, fluffed posture, or unusual droppings.',
      ],
      tone: 'risk',
    },
    {
      id: 'uncommon',
      title: 'Uncommon but useful advice',
      summary: 'Advanced observations can help early intervention.',
      bullets: [
        'Compare behavior by time-of-day; many issues appear first at routine transitions.',
        'Track context (temperature, AQI, noise) with each notable audio event.',
        'If signals are ambiguous, prioritize trend direction over one-day spikes.',
      ],
      tone: 'tip',
    },
  ],
  howToTitle: 'How to use this app effectively',
  howToSteps: [
    'Create each parakeet profile with identity details and notes.',
    'Record in a quiet room for at least 30 seconds when possible.',
    'Review mood, confidence, and recommendations after each analysis.',
    'Use History weekly to identify trend changes, not one-off fluctuations.',
    'Configure habitat coordinates in Settings for context-driven risk alerts.',
  ],
  safetyNote:
    'This app provides educational support and trend visibility. It does not replace diagnosis by an avian veterinarian.',
};
