
const express = require('express')
const logger = require('../logger')
const {bookmarks} = require('../store')
const BookmarksService = require('./bookmarks-service')
const {isWebUri} = require('valid-url')
const xss = require('xss')
const path = require('path')
const {getBookmarkValidationError} = require('./bookmark-validator')

const bookmarksRouter = express.Router()
const bodyParser = express.json()

const serializeBookmark = bookmark => ({
    id: bookmark.id,
    title: xss(bookmark.title),
    url: bookmark.url,
    rating: Number(bookmark.rating),
    description: xss(bookmark.description)
})

bookmarksRouter
    .route('/')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db')
        BookmarksService.getAllBookmarks(knexInstance)
            .then(bookmarks => {
                res.json(bookmarks.map(serializeBookmark))
            })
            .catch(next)
    })
    .post(bodyParser, (req, res, next) => {
        const {title, url, rating, description} = req.body
        const newBookmark = {title, url, rating, description}

        // for(const [key,value] of Object.entries(newBookmark))
        // if(value == null)
        // return res.status(400).json({
        //     error: {message: `Missing '${key}' in request body`}
        // })

        for (const field of ['title', 'url', 'rating']) {
            if (!req.body[field]) {
              logger.error(`${field} is required`)
              return res.status(400).send({
                error: { message: `Missing '${field}' in request body` }
              })
            }
          }

        const ratingNumber = Number(rating)

        if(!Number.isInteger(ratingNumber) || rating < 0 || rating > 5) {
            logger.error(`Invalid rating.`)
            return res.status(400).json({
                error: {message: `'Rating' must be between 0 and 5`}
            })
        }

        if(!isWebUri(url)) {
            return res.status(400).json({
                error: {message: `'url' must be a valid URL`}
            })
        }

        BookmarksService.insertBookmark(
            req.app.get('db'),
            newBookmark
        )
            .then(bookmark => {
                res
                    .status(201)
                    .location(path.posix.join(req.originalUrl, `/${bookmark.id}`))
                    .json(serializeBookmark(bookmark))
            })
            .catch(next)
    })

bookmarksRouter
    .route('/:id')
    .all((req, res, next) => {
        const {id} = req.params
        const knexInstance = req.app.get('db')
        BookmarksService.getById(knexInstance, id)
            .then(bookmark => {
                if(!bookmark) {
                    logger.error(`Bookmark with id ${id} not found.`)
                    return res.status(404).json({
                        error: {message: `Bookmark Not Found`}
                    })
                }
                res.bookmark = bookmark
                next()
            })
            .catch(next)
    })
    .get((req, res, next) => {
        res.json(serializeBookmark(res.bookmark))
    })
    .delete((req, res, next) => {
        const { id } = req.params
        BookmarksService.deleteBookmark(
        req.app.get('db'),
        id
        )
        .then(numRowsAffected => {
            logger.info(`Bookmark with id ${id} deleted.`)
            res.status(204).end()
        })
        .catch(next)
    })
    .patch(bodyParser, (req, res, next) => {
        const {title, url, rating, description} = req.body
        const bookmarkToUpdate = {title, url, rating, description}
        const numberOfValues = Object.values(bookmarkToUpdate).filter(Boolean).length
        if(numberOfValues === 0) {
            logger.error(`Invalid update without required fields`)
            return res.status(400).json({
                error: {
                    message: `Request body must contain either 'title', 'url', or 'rating'`
                }
            })
        }

        const error = getBookmarkValidationError(bookmarkToUpdate)
        if(error) return res.status(400).send(error)
        
        BookmarksService.updateBookmark(
            req.app.get('db'),
            req.params.id,
            bookmarkToUpdate
        )
            .then(numRowsAffected => {
                res.status(204).json(serializeBookmark(bookmarkToUpdate)).end() 
            })
            .catch(next)
    })

module.exports = bookmarksRouter