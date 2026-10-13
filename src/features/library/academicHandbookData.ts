// ============================================================
// Global College — Institutional Academic Handbooks & E-Textbooks
// Native In-App High Resolution Reader Content Engine
// ============================================================

export interface HandbookChapter {
  id: string
  number: number
  title: string
  summary: string
  sections: {
    heading: string
    content: string[]
    codeSnippet?: string
    codeLanguage?: string
    keyPoints?: string[]
    practiceQuestions?: { q: string; a: string }[]
  }[]
}

export interface AcademicHandbook {
  id: string
  title: string
  subtitle: string
  faculty: string
  edition: string
  year: number
  totalChapters: number
  estimatedReadTime: string
  chapters: HandbookChapter[]
}

export const ACADEMIC_HANDBOOKS: Record<string, AcademicHandbook> = {}

export interface ComicPanel {
  panelNumber: number
  characterName?: string
  avatarEmoji?: string
  dialogue?: string
  thought?: string
  narrative?: string
  sfx?: string
  backgroundTheme: 'cyber' | 'action' | 'noir' | 'scifi' | 'campus' | 'dramatic'
  illustrationEmoji: string
  illustrationVisual: string
  codeSnippet?: string
  terminalOutput?: string
}

export interface ComicIssue {
  issueNumber: number
  title: string
  synopsis: string
  coverEmoji: string
  panels: ComicPanel[]
}

export interface ComicBook {
  id: string
  title: string
  series: string
  volume: string
  genre: 'Cyberpunk & Security' | 'Tech Mystery & Noir' | 'Manga & Sci-Fi' | 'AI & Future Tech'
  author: string
  illustrator: string
  year: number
  estimatedReadTime: string
  coverEmoji: string
  coverColor: string
  synopsis: string
  issues: ComicIssue[]
}

export const COMIC_BOOKS_DATA: Record<string, ComicBook> = {}
