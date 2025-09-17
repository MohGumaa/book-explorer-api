export interface GutendxBook {
  id: number
  title: string
  authors: Array<{
    name: string
    birth_year?: number
    death_year?: number
  }>
  translators: Array<{
    name: string
    birth_year?: number
    death_year?: number
  }>
  subjects: string[]
  bookshelves: string[]
  languages: string[]
  copyright?: boolean
  media_type: string
  formats: Record<string, string>
  download_count: number
}

export interface GutendxResponse {
  count: number
  next: string | null
  previous: string | null
  results: GutendxBook[]
}

export interface BookSearchParams {
  page?: number
  search?: string
  author?: string
  title?: string
  languages?: string
  topic?: string
}

export interface FavoriteBook {
  id: number
  userId: string
  bookId: number
  addedAt: Date
}

export interface PopularBook extends GutendxBook {
  rank: number
}
