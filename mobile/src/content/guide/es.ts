import type { GuideContent } from './types';

export const guideEs: GuideContent = {
  heroTitle: 'Guía del Periquito Australiano',
  heroSubtitle: 'Cuidados prácticos, señales de alerta y rutinas inteligentes para su bienestar diario.',
  sections: [
    {
      id: 'species',
      title: 'Información de la especie',
      summary: 'Los periquitos australianos son loros sociales e inteligentes que prosperan con rutina e interacción.',
      bullets: [
        'La esperanza de vida suele estar entre 7-12 años con buen cuidado.',
        'Necesitan estimulación social diaria, no solo comida y agua.',
        'Peso, cambios de voz y postura son indicadores tempranos clave.',
      ],
      tone: 'info',
    },
    {
      id: 'history',
      title: 'Historia y contexto conductual',
      summary: 'El periquito evolucionó en pastizales australianos y su conducta está ligada a la comunicación en bandada.',
      bullets: [
        'El canto frecuente puede ser comunicación normal de grupo.',
        'El silencio súbito puede indicar estrés, miedo o malestar.',
        'Los ciclos regulares de luz/oscuridad influyen mucho en su estabilidad conductual.',
      ],
      tone: 'info',
    },
    {
      id: 'care',
      title: 'Cuidados diarios esenciales',
      summary: 'Los fundamentos correctos reducen la mayoría de riesgos evitables.',
      bullets: [
        'Ofrece agua limpia cada día y controla restos de alimento.',
        'Incluye enriquecimiento seguro (perchas, juguetes, forrajeo).',
        'Mantén la temperatura ambiental estable y evita corrientes directas.',
      ],
      tone: 'tip',
    },
    {
      id: 'tips',
      title: 'Tips de cuidado',
      summary: 'Pequeños hábitos mejoran resultados a largo plazo.',
      bullets: [
        'Usa una rutina semanal simple: limpieza, rotación de juguetes y notas de conducta.',
        'Graba líneas base de voz en momentos tranquilos para comparar.',
        'Relaciona apetito y sueño con los patrones de vocalización.',
      ],
      tone: 'tip',
    },
    {
      id: 'risks',
      title: 'Riesgos principales',
      summary: 'Estas categorías de riesgo requieren atención rápida.',
      bullets: [
        'Problemas de calidad del aire (humo, aerosoles, mala ventilación).',
        'Estrés térmico por calor elevado o corrientes frías.',
        'Estrés crónico por ruido, depredadores o rutina inestable.',
      ],
      tone: 'risk',
    },
    {
      id: 'signs',
      title: 'Señales comunes de alerta',
      summary: 'Observa conjuntos de señales, no solo eventos aislados.',
      bullets: [
        'Baja actividad sostenida con menor vocalización.',
        'Cambios respiratorios o movimiento persistente de cola al respirar.',
        'Pérdida de apetito, postura erizada o heces inusuales.',
      ],
      tone: 'risk',
    },
    {
      id: 'uncommon',
      title: 'Consejos poco comunes pero útiles',
      summary: 'Observaciones avanzadas ayudan a detectar problemas temprano.',
      bullets: [
        'Compara conducta por franja horaria; muchos problemas aparecen en cambios de rutina.',
        'Registra contexto (temperatura, AQI, ruido) con cada evento importante de audio.',
        'Si hay señales ambiguas, prioriza la tendencia semanal más que picos de un día.',
      ],
      tone: 'tip',
    },
  ],
  howToTitle: 'Cómo usar esta app de forma efectiva',
  howToSteps: [
    'Crea el perfil de cada periquito con datos y notas clave.',
    'Graba en ambiente silencioso, idealmente al menos 30 segundos.',
    'Revisa estado, confianza y recomendaciones tras cada análisis.',
    'Usa Historial semanalmente para detectar tendencias y no solo cambios aislados.',
    'Configura coordenadas del hábitat en Ajustes para alertas contextuales.',
  ],
  safetyNote:
    'Esta app ofrece apoyo educativo y visibilidad de tendencias. No reemplaza el diagnóstico de un veterinario aviar.',
};
