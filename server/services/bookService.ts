import type { GutendxBook, FavoriteBook, PopularBook } from "../types/index"
const gutendxService = require("./gutendxService")

class BookService {
  private favorites: Map<string, FavoriteBook[]> = new Map()
  private popularBooksCache: PopularBook[] = []
  private lastPopularUpdate: Date = new Date(0)

  // Favorites functionality
  addToFavorites(userId: string, bookId: number): FavoriteBook {
    if (!this.favorites.has(userId)) {
      this.favorites.set(userId, [])
    }

    const userFavorites = this.favorites.get(userId)!

    // Check if already favorited
    const existing = userFavorites.find((fav) => fav.bookId === bookId)
    if (existing) {
      throw new Error("Book already in favorites")
    }

    const favorite: FavoriteBook = {
      id: Date.now(), // Simple ID generation
      userId,
      bookId,
      addedAt: new Date(),
    }

    userFavorites.push(favorite)
    console.log("[v0] Added book to favorites:", { userId, bookId })

    return favorite
  }

  removeFromFavorites(userId: string, bookId: number): boolean {
    const userFavorites = this.favorites.get(userId)
    if (!userFavorites) return false

    const index = userFavorites.findIndex((fav) => fav.bookId === bookId)
    if (index === -1) return false

    userFavorites.splice(index, 1)
    console.log("[v0] Removed book from favorites:", { userId, bookId })

    return true
  }

  getUserFavorites(userId: string): FavoriteBook[] {
    return this.favorites.get(userId) || []
  }

  async getUserFavoriteBooksDetails(userId: string): Promise<GutendxBook[]> {
    const userFavorites = this.getUserFavorites(userId)
    const bookDetails: GutendxBook[] = []

    for (const favorite of userFavorites) {
      try {
        const book = await gutendxService.getBookById(favorite.bookId)
        if (book) {
          bookDetails.push(book)
        }
      } catch (error) {
        console.error("[v0] Error fetching favorite book details:", error)
      }
    }

    return bookDetails
  }

  // Popular books functionality
  async getPopularBooks(limit = 10): Promise<PopularBook[]> {
    // Update popular books cache every hour
    const oneHour = 60 * 60 * 1000
    const now = new Date()

    if (now.getTime() - this.lastPopularUpdate.getTime() > oneHour) {
      await this.updatePopularBooksCache()
    }

    return this.popularBooksCache.slice(0, limit)
  }

  private async updatePopularBooksCache(): Promise<void> {
    try {
      console.log("[v0] Updating popular books cache...")

      // Fetch multiple pages to get a good sample of books
      const allBooks: GutendxBook[] = []

      for (let page = 1; page <= 5; page++) {
        const response = await gutendxService.searchBooks({ page })
        allBooks.push(...response.results)
      }

      // Sort by download count and create popular books
      const sortedBooks = allBooks
        .sort((a, b) => b.download_count - a.download_count)
        .slice(0, 50) // Keep top 50 for variety
        .map(
          (book, index): PopularBook => ({
            ...book,
            rank: index + 1,
          }),
        )

      this.popularBooksCache = sortedBooks
      this.lastPopularUpdate = new Date()

      console.log("[v0] Popular books cache updated with", sortedBooks.length, "books")
    } catch (error) {
      console.error("[v0] Error updating popular books cache:", error)
    }
  }

  // Get service statistics
  getStats() {
    const totalFavorites = Array.from(this.favorites.values()).reduce((sum, userFavs) => sum + userFavs.length, 0)

    return {
      totalUsers: this.favorites.size,
      totalFavorites,
      popularBooksCount: this.popularBooksCache.length,
      lastPopularUpdate: this.lastPopularUpdate,
      cacheStats: gutendxService.getCacheStats(),
    }
  }
}

const bookService = new BookService()
export = bookService
