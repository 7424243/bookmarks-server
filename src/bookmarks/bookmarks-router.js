require('dotenv').config()
const express = require('express')
const {v4: uuid} = require('uuid')
const logger = require('../logger')
const {bookmarks} = require('../store')
const BookmarksService = require('./bookmarks-service')

const bookmarksRouter = express.Router()
const bodyParser = express.json()

bookmarksRouter
    .route('/bookmarks')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db')
        BookmarksService.getAllBookmarks(knexInstance)
            .then(bookmarks => {
                res.json(bookmarks)
            })
            .catch(next)
    })
    .post(bodyParser, (req, res) => {
        const {title, url, rating, desc} = req.body
        if(!title) {
            logger.error(`Title is required`)
            return res.status(400).send('Invalid data')
        }
        if(!url) {
            logger.error(`Url is required`)
            return res.status(400).send('Invalid data')
        }
        if(!rating) {
            logger.error(`Rating is required`)
            return res.status(400).send('Invalid data')
        }
        if(!desc) {
            logger.error(`Description is required`)
            return res.status(400).send('Invalid data')
         }
        if(rating < 0 || rating > 5) {
            logger.error(`Invalid rating.`)
            return res.status(400).send(`Rating must be a number between 0 and 5`)
        }
    
        const id = uuid()
        const bookmark = {
            id,
            title,
            url,
            rating,
            desc
        }
        bookmarks.push(bookmark)
        logger.info(`Bookmark with id ${id} created`)
        res.status(201).location(`http://localhost:8000/bookmarks/${id}`).json(bookmark)
    })

bookmarksRouter
    .route('/bookmarks/:id')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db')
        BookmarksService.getById(knexInstance, req.params.id)
            .then(bookmark => {
                if(!bookmark) {
                    logger.error(`Bookmark with id ${id} not found.`)
                    return res.status(404).send('bookmark not found')
                }
                res.json(bookmark)
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