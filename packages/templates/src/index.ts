// Other packages type-check this file through their own configs, which never include `raw.d.ts`.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./raw.d.ts" />
// The app's own templates for new projects and starter outlines (Milestone 19). The outlines are plain
// Markdown in `starters/`, one folder per language, so a writer can edit them in any editor; they're
// bundled as text, so nothing is read from the install folder or downloaded.
import campaignArcEn from '../starters/en/campaign-arc.md?raw'
import characterArcEn from '../starters/en/character-arc.md?raw'
import collectionEn from '../starters/en/collection.md?raw'
import looseIdeasEn from '../starters/en/loose-ideas.md?raw'
import sessionPlanEn from '../starters/en/session-plan.md?raw'
import shortStoryEn from '../starters/en/short-story.md?raw'
import storyBeatsEn from '../starters/en/story-beats.md?raw'
import threeActsEn from '../starters/en/three-acts.md?raw'
import campaignArcHe from '../starters/he/campaign-arc.md?raw'
import characterArcHe from '../starters/he/character-arc.md?raw'
import collectionHe from '../starters/he/collection.md?raw'
import looseIdeasHe from '../starters/he/loose-ideas.md?raw'
import sessionPlanHe from '../starters/he/session-plan.md?raw'
import shortStoryHe from '../starters/he/short-story.md?raw'
import storyBeatsHe from '../starters/he/story-beats.md?raw'
import threeActsHe from '../starters/he/three-acts.md?raw'

export const TEMPLATE_IDS = ['novel', 'short-story', 'poetry', 'campaign', 'blank'] as const
export type TemplateId = (typeof TEMPLATE_IDS)[number]

export const STARTER_IDS = [
  'three-acts',
  'story-beats',
  'character-arc',
  'campaign-arc',
  'session-plan',
  'short-story',
  'loose-ideas',
  'collection',
] as const
export type StarterId = (typeof STARTER_IDS)[number]

/** The starters "New outline" offers, in its order; the others only come with a template. */
export const OFFERED_STARTERS: readonly StarterId[] = ['three-acts', 'story-beats', 'character-arc', 'campaign-arc', 'session-plan']

type TemplateLanguage = 'en' | 'he'

const STARTERS: Record<TemplateLanguage, Record<StarterId, string>> = {
  en: {
    'three-acts': threeActsEn,
    'story-beats': storyBeatsEn,
    'character-arc': characterArcEn,
    'campaign-arc': campaignArcEn,
    'session-plan': sessionPlanEn,
    'short-story': shortStoryEn,
    'loose-ideas': looseIdeasEn,
    collection: collectionEn,
  },
  he: {
    'three-acts': threeActsHe,
    'story-beats': storyBeatsHe,
    'character-arc': characterArcHe,
    'campaign-arc': campaignArcHe,
    'session-plan': sessionPlanHe,
    'short-story': shortStoryHe,
    'loose-ideas': looseIdeasHe,
    collection: collectionHe,
  },
}

/** A starter outline: its own title, and everything under the title line. */
export interface Starter {
  title: string
  body: string
}

/** A kind of page as `project.md` lists it (ADR 0011); `null` kinds means the three defaults. */
export interface TemplateKind {
  folder: string
  one?: string
  many?: string
}

export interface ProjectTemplate {
  kinds: TemplateKind[] | null
  manuscriptUnit: { one: string; many: string } | null
  /** What the book calls a part (ADR 0013), or `null` for the app's own word. */
  partUnit: { one: string; many: string } | null
  /** `poem`: every new chapter, the first one too, starts as a poem (ADR 0013). */
  chapterForm: 'prose' | 'poem'
  suggestedTags: string[]
  /** One empty chapter, named after the book. */
  firstChapter: boolean
  /** The outlines; a book with no chapter opens on the first (Milestone 19, decision 4). */
  outlines: { title: string; body: string }[]
}

/** Templates are written in English and Hebrew; any other story language gets English. */
export function templateLanguage(language: string): TemplateLanguage {
  return /^he(-|$)/i.test(language) ? 'he' : 'en'
}

export function starter(id: StarterId, language: string): Starter {
  const text = STARTERS[templateLanguage(language)][id].replace(/\r\n/g, '\n')
  const [first = '', ...rest] = text.split('\n')
  return { title: first.replace(/^#\s+/, '').trim(), body: rest.join('\n').replace(/^\n+/, '') }
}

interface TemplateWords {
  outlines: { starter: StarterId; title?: string }[]
  kinds: TemplateKind[] | null
  manuscriptUnit: { one: string; many: string } | null
  partUnit?: { one: string; many: string }
  suggestedTags: string[]
}

const WORDS: Record<Exclude<TemplateId, 'blank'>, Record<TemplateLanguage, TemplateWords>> = {
  novel: {
    en: {
      outlines: [{ starter: 'three-acts', title: 'Main story' }, { starter: 'loose-ideas' }],
      kinds: null,
      manuscriptUnit: null,
      suggestedTags: ['Main character', 'Secondary'],
    },
    he: {
      outlines: [{ starter: 'three-acts', title: 'העלילה' }, { starter: 'loose-ideas' }],
      kinds: null,
      manuscriptUnit: null,
      suggestedTags: ['דמות ראשית', 'דמות משנית'],
    },
  },
  'short-story': {
    en: {
      outlines: [{ starter: 'short-story' }],
      kinds: [{ folder: 'characters' }, { folder: 'notes' }],
      manuscriptUnit: null,
      suggestedTags: [],
    },
    he: {
      outlines: [{ starter: 'short-story' }],
      kinds: [{ folder: 'characters' }, { folder: 'notes' }],
      manuscriptUnit: null,
      suggestedTags: [],
    },
  },
  poetry: {
    en: {
      outlines: [{ starter: 'collection' }],
      kinds: [{ folder: 'notes' }],
      manuscriptUnit: { one: 'Poem', many: 'Poems' },
      partUnit: { one: 'Section', many: 'Sections' },
      suggestedTags: ['Draft', 'Ready'],
    },
    he: {
      outlines: [{ starter: 'collection' }],
      kinds: [{ folder: 'notes' }],
      manuscriptUnit: { one: 'שיר', many: 'שירים' },
      partUnit: { one: 'אסופה', many: 'אסופות' },
      suggestedTags: ['טיוטה', 'מוכן'],
    },
  },
  campaign: {
    en: {
      outlines: [{ starter: 'session-plan' }, { starter: 'campaign-arc' }],
      kinds: [
        { folder: 'npcs', one: 'NPC', many: 'NPCs' },
        { folder: 'locations', one: 'Location', many: 'Locations' },
        { folder: 'factions', one: 'Faction', many: 'Factions' },
        { folder: 'items', one: 'Item', many: 'Items' },
        { folder: 'lore', one: 'Lore', many: 'Lore' },
      ],
      manuscriptUnit: { one: 'Session', many: 'Sessions' },
      suggestedTags: ['Player character', 'Villain', 'Ally'],
    },
    he: {
      outlines: [{ starter: 'session-plan' }, { starter: 'campaign-arc' }],
      kinds: [
        { folder: 'דמויות', one: 'דמות', many: 'דמויות' },
        { folder: 'מקומות', one: 'מקום', many: 'מקומות' },
        { folder: 'פלגים', one: 'פלג', many: 'פלגים' },
        { folder: 'חפצים', one: 'חפץ', many: 'חפצים' },
        { folder: 'ידע', one: 'ידע', many: 'ידע' },
      ],
      manuscriptUnit: { one: 'מפגש', many: 'מפגשים' },
      suggestedTags: ['דמות שחקן', 'נבל', 'בן ברית'],
    },
  },
}

/** What a new project from `id` starts with, in the story's language. */
export function projectTemplate(id: TemplateId, language: string): ProjectTemplate {
  if (id === 'blank')
    return { kinds: null, manuscriptUnit: null, partUnit: null, chapterForm: 'prose', suggestedTags: [], firstChapter: false, outlines: [] }
  const lang = templateLanguage(language)
  const words = WORDS[id][lang]
  return {
    kinds: words.kinds,
    manuscriptUnit: words.manuscriptUnit,
    partUnit: words.partUnit ?? null,
    chapterForm: id === 'poetry' ? 'poem' : 'prose',
    suggestedTags: words.suggestedTags,
    // A short story and a poetry collection open ready to write (ADR 0013).
    firstChapter: id === 'short-story' || id === 'poetry',
    outlines: words.outlines.map((outline) => {
      const own = starter(outline.starter, lang)
      return { title: outline.title ?? own.title, body: own.body }
    }),
  }
}
