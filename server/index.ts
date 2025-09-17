import express from "express"
import cors from "cors"
import dotenv from "dotenv"
const gutendxService = require("./services/gutendxService")
const bookService = require("./services/bookService")
import type { BookSearchParams } from "./types/index.js"

const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:4173",
    "https://book-explorer-green.vercel.app",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}

// Load default env first
dotenv.config();

// Pick env-specific file
const env = process.env.NODE_ENV || "production";
dotenv.config({ path: `.env.${env}.local` });


const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors(corsOptions))
app.use(express.json())

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    stats: bookService.getStats(),
  })
})

// Books search endpoint
app.get("/api/books", async (req, res) => {
  try {
    const params: BookSearchParams = {
      page: req.query.page ? Number.parseInt(req.query.page as string) : 1,
      search: req.query.search as string,
      author: req.query.author as string,
      title: req.query.title as string,
      languages: req.query.languages as string,
      topic: req.query.topic as string,
    }

    console.log("[v0] Books search request:", params)

    const result = await gutendxService.searchBooks(params)
    res.json(result)
  } catch (error) {
    console.error("[v0] Error in /api/books:", error)
    res.status(500).json({
      error: "Failed to fetch books",
      message: error instanceof Error ? error.message : "Unknown error",
    })
  }
})

// Single book endpoint
app.get("/api/books/:id", async (req, res) => {
  try {
    const bookId = Number.parseInt(req.params.id)

    if (isNaN(bookId)) {
      return res.status(400).json({ error: "Invalid book ID" })
    }

    console.log("[v0] Single book request:", bookId)

    const book = await gutendxService.getBookById(bookId)

    if (!book) {
      return res.status(404).json({ error: "Book not found" })
    }

    res.json(book)
  } catch (error) {
    console.error("[v0] Error in /api/books/:id:", error)
    res.status(500).json({
      error: "Failed to fetch book",
      message: error instanceof Error ? error.message : "Unknown error",
    })
  }
})

// Popular books endpoint
app.get("/api/books/popular/top", async (req, res) => {
  try {
    const limit = req.query.limit ? Number.parseInt(req.query.limit as string) : 10

    console.log("[v0] Popular books request, limit:", limit)

    const popularBooks = await bookService.getPopularBooks(limit)
    res.json(popularBooks)
  } catch (error) {
    console.error("[v0] Error in /api/books/popular/top:", error)
    res.status(500).json({
      error: "Failed to fetch popular books",
      message: error instanceof Error ? error.message : "Unknown error",
    })
  }
})

// Favorites endpoints
app.post("/api/favorites", async (req, res) => {
  try {
    const { userId, bookId } = req.body

    if (!userId || !bookId) {
      return res.status(400).json({ error: "userId and bookId are required" })
    }

    console.log("[v0] Add to favorites request:", { userId, bookId })

    const favorite = bookService.addToFavorites(userId, bookId)
    res.status(201).json(favorite)
  } catch (error) {
    console.error("[v0] Error in POST /api/favorites:", error)

    if (error instanceof Error && error.message === "Book already in favorites") {
      return res.status(409).json({ error: error.message })
    }

    res.status(500).json({
      error: "Failed to add to favorites",
      message: error instanceof Error ? error.message : "Unknown error",
    })
  }
})

app.delete("/api/favorites", async (req, res) => {
  try {
    const { userId, bookId } = req.body

    if (!userId || !bookId) {
      return res.status(400).json({ error: "userId and bookId are required" })
    }

    console.log("[v0] Remove from favorites request:", { userId, bookId })

    const removed = bookService.removeFromFavorites(userId, bookId)

    if (!removed) {
      return res.status(404).json({ error: "Favorite not found" })
    }

    res.json({ message: "Removed from favorites" })
  } catch (error) {
    console.error("[v0] Error in DELETE /api/favorites:", error)
    res.status(500).json({
      error: "Failed to remove from favorites",
      message: error instanceof Error ? error.message : "Unknown error",
    })
  }
})

app.get("/api/favorites/:userId", async (req, res) => {
  try {
    const userId = req.params.userId
    const includeDetails = req.query.details === "true"

    console.log("[v0] Get user favorites request:", { userId, includeDetails })

    if (includeDetails) {
      const favoriteBooksDetails = await bookService.getUserFavoriteBooksDetails(userId)
      res.json(favoriteBooksDetails)
    } else {
      const favorites = bookService.getUserFavorites(userId)
      res.json(favorites)
    }
  } catch (error) {
    console.error("[v0] Error in GET /api/favorites/:userId:", error)
    res.status(500).json({
      error: "Failed to fetch favorites",
      message: error instanceof Error ? error.message : "Unknown error",
    })
  }
})

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[v0] Unhandled error:", err)
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : "Something went wrong",
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" })
})

app.listen(PORT, () => {
  console.log(`Book API server running on port ${PORT} - ${env}`)
  console.log(`Health check: http://localhost:${PORT}/health`)
  console.log(`API endpoints:`)
  console.log(`  GET /api/books?page=1&search=tolstoy`)
  console.log(`  GET /api/books/:id`)
  console.log(`  GET /api/books/popular/top?limit=10`)
  console.log(`  POST /api/favorites`)
  console.log(`  DELETE /api/favorites`)
  console.log(`  GET /api/favorites/:userId?details=true`)
})
