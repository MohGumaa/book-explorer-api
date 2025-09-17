import axios from "axios"
import NodeCache from "node-cache"
import type { GutendxResponse, GutendxBook, BookSearchParams } from "../types"

class GutendxService {
  private cache: NodeCache
  private baseUrl = "https://gutendex.com/books"

  constructor() {
    // Cache for 10 minutes
    this.cache = new NodeCache({ stdTTL: 600 })
  }

  async searchBooks(params: BookSearchParams): Promise<GutendxResponse> {
    const cacheKey = this.generateCacheKey("search", params)
    const cached = this.cache.get<GutendxResponse>(cacheKey)

    if (cached) {
      console.log("[v0] Cache hit for search:", cacheKey)
      return cached
    }

    try {
      const queryParams = new URLSearchParams()

      if (params.page) queryParams.append("page", params.page.toString())
      if (params.search) queryParams.append("search", params.search)
      if (params.author) queryParams.append("author", params.author)
      if (params.title) queryParams.append("title", params.title)
      if (params.languages) queryParams.append("languages", params.languages)
      if (params.topic) queryParams.append("topic", params.topic)

      const url = `${this.baseUrl}?${queryParams.toString()}`
      console.log("[v0] Fetching from Gutendx:", url)

      const response = await axios.get<GutendxResponse>(url)

      // Cache the response
      this.cache.set(cacheKey, response.data)

      return response.data
    } catch (error) {
      console.error("[v0] Error fetching from Gutendx:", error)
      throw new Error("Failed to fetch books from Gutendx API")
    }
  }

  async getBookById(id: number): Promise<GutendxBook | null> {
    const cacheKey = this.generateCacheKey("book", { id })
    const cached = this.cache.get<GutendxBook>(cacheKey)

    if (cached) {
      console.log("[v0] Cache hit for book:", cacheKey)
      return cached
    }

    try {
      const url = `${this.baseUrl}/${id}`
      console.log("[v0] Fetching book from Gutendx:", url)

      const response = await axios.get(url)

      // Cache the response
      this.cache.set(cacheKey, response.data)

      return response.data as GutendxBook
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null
      }
      console.error("[v0] Error fetching book from Gutendx:", error)
      throw new Error("Failed to fetch book from Gutendx API")
    }
  }

  private generateCacheKey(type: string, params: any): string {
    return `${type}:${JSON.stringify(params)}`
  }

  // Get cache statistics
  getCacheStats() {
    return {
      keys: this.cache.keys().length,
      hits: this.cache.getStats().hits,
      misses: this.cache.getStats().misses,
    }
  }
}

const gutendxService = new GutendxService()
export = gutendxService
