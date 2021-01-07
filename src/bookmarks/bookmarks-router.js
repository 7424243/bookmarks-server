
const express = require('express')
const logger = require('../logger')
const {bookmarks} = require('../store')
const BookmarksService = require('./bookmarks-service')
const {isWebUri} = require('valid-url')
const xss = require('xss')

const bookmarksRouter = express.Router()
const bodyParser = express.json()

const serializeBookmark = bookmark => ({
    id: bookmark.id,
    title: xss(bookmark.title),
    rating: bookmark.rating,
    description: xss(bookmark.description)
})

bookmarksRouter
    .route('/bookmarks')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db')
        BookmarksService.getAllBookmarks(knexInstance)
            .then(bookmarks => {
                res.json(serializeBookmark(bookmarks))
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
                    .location(`/bookmarks/${bookmark.id}`)
                    .json(serializeBookmark(bookmark))
            })
            .catch(next)
    })

bookmarksRouter
    .route('/bookmarks/:id')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db')
        BookmarksService.getById(knexInstance, req.params.id)
            .then(bookmark => {
                if(!bookmark) {
                    return res.status(404).json({
                        error: {message: `Bookmark Not Found`}
                    })
                }
                res.json(serializeBookmark(bookmark))
            })
            .catch(next)
    })
    .delete((req, res) => {
        const {id} = req.params
        const bookmarkIndex = bookmarks.findIndex(b => b.id == id)
        if(bookmarkIndex === -1) {
            logger.error(`Bookmark with id ${id} not found.`)
            return res.status(400).send('Not Found')
        }
        bookmarks.splice(bookmarkIndex, 1)
        logger.error(`Bookmark with id ${id} deleted.`)
        res.status(204).end()
    })

module.exports = bookmarksRouter