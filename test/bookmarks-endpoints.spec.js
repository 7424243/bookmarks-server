const {expect} = require('chai')
const knex = require('knex')
const supertest = require('supertest')
const app = require('../src/app')
const {makeBookmarksArray, makeMaliciousBookmark} = require('./bookmarks.fixtures')

describe('Bookmarks Endpoints', function() {
    let db

    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL,
        })
        app.set('db', db)
    })

    after('disconnect from db', () => db.destroy())

    before('cleanup', () => db('bookmarks').truncate())

    afterEach('cleanup', () => db('bookmarks').truncate())

    describe(`Get /bookmarks`, () => {
        context('Given no bookmarks', () => {
            it(`responds with 200 and an empty list`, () => {
                return supertest(app)
                    .get('/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, [])
            })

        })
        context(`Given there are bookmarks in the database`, () => {
            const testBookmarks = makeBookmarksArray()
            beforeEach('insert bookmarks', () => {
                return db 
                    .into('bookmarks')
                    .insert(testBookmarks)
            })
            it('GET /bookmarks responds with 200 and all of the bookmarks', () => {
                return supertest(app)
                    .get('/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, testBookmarks)
            })
        })
        context(`Given an XSS attack bookmark`, () => {
            const {maliciousBookmark, expectedBookmark} = makeMaliciousBookmark()
            beforeEach(`insert malicious bookmark`, () => {
                return db
                    .into('bookmarks')
                    .insert([maliciousBookmark])
            })
            it(`removes XSS attack content`, () => {
                return supertest(app)
                    .get('/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body[0].title).to.eql(expectedBookmark.title)
                        expect(res.body[0].description).to.eql(expectedBookmark.description)
                    })
            })
        })
    })
    describe(`GET /bookmarks/:id`, () => {
        context(`Given no bookmarks`, () => {
            it(`responds 404 when bookmark doesn't exist`, () => {
                const bookmarkId = 123456
              return supertest(app)
                .get(`/bookmarks/${bookmarkId}`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(404, {
                  error: { message: `Bookmark Not Found` }
                })
            })
        })
        context('Given there are bookmarks in the database', () => {
            const testBookmarks = makeBookmarksArray()
            beforeEach('insert articles', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            })
            it(`GET /bookmarks/:id responds wiht 200 and the specified bookmark`, () => {
                const bookmarkId = 2
                const expectedBookmark = testBookmarks[bookmarkId - 1]
                return supertest(app)
                    .get(`/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, expectedBookmark)
            })
        })
        context(`Given an XXS attack bookmark`, () => {
            const {maliciousBookmark, expectedBookmark} = makeMaliciousBookmark()
            beforeEach('insert malicious bookmark', () => {
                return db
                    .into('bookmarks')
                    .insert([maliciousBookmark])
            })
            it(`removes XXS attack content`, () => {
                return supertest(app)
                    .get(`/bookmarks/${maliciousBookmark.id}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body.title).to.eql(expectedBookmark.title)
                        expect(res.body.description).to.eql(expectedBookmark.description)
                    })
            })
        })
    })
    describe.only(`POST /bookmarks`, () => {
        it('adds a new bookmark to the database', () => {
            const newBookmark = {
              title: 'test-title',
              url: 'https://test.com',
              rating: 4,
              description: 'test description',
              
            }
            return supertest(app)
                .post(`/bookmarks`)
                .send(newBookmark)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(newBookmark.title)
                    expect(res.body.url).to.eql(newBookmark.url)
                    expect(res.body.description).to.eql(newBookmark.description)
                    expect(res.body.rating).to.eql(newBookmark.rating)
                    expect(res.body).to.have.property('id')
                    expect(res.headers.location).to.eql(`/bookmarks/${res.body.id}`)
                })
                .then(res =>
                    supertest(app)
                    .get(`/bookmarks/${res.body.id}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(res.body)
                )
        })
        it(`responds with 400 and an error message when the 'title' is missing`, () => {
            return supertest(app)
                .post('/bookmarks')
                .send({
                    url: 'https://thisisatest.com',
                    rating: 2,
                })
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(400, {
                    error: {message: `Missing 'title' in request body`}
                })
        })
        it(`responds with 400 and an error message when the 'url' is missing`, () => {
            return supertest(app)
                .post('/bookmarks')
                .send({
                    title: 'Test title',
                    rating: 2,
                })
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(400, {
                    error: {message: `Missing 'url' in request body`}
                })
        })
        it(`responds with 400 and an error message when the 'rating' is missing`, () => {
            return supertest(app)
                .post('/bookmarks')
                .send({
                    title: 'Test title',
                    url: 'https://thisisatest.com',
                })
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(400, {
                    error: {message: `Missing 'rating' in request body`}
                })
        })
        it(`responds with 400 and an error message when the 'rating' is NOT between 0 and 5`, () => {
            return supertest(app)
                .post('/bookmarks')
                .send({
                    title: 'Test title',
                    url: 'https://thisisatest.com',
                    rating: 10,
                })
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(400, {
                    error: {message: `'Rating' must be between 0 and 5`}
                })
        })
        it(`responds with 400 and an error message when the 'url' is not valid`, () => {
            return supertest(app)
                .post('/bookmarks')
                .send({
                    title: 'Test title',
                    url: 'htp://invalid url',
                    rating: 1,
                })
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(400, {
                    error: {message: `'url' must be a valid URL`}
                })
        })
        it(`removes XSS attack content from response`, () => {
            const {maliciousBookmark, expectedBookmark} = makeMaliciousBookmark()
            return supertest(app)
                .post('/bookmarks')
                .send(maliciousBookmark)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(expectedBookmark.title)
                    expect(res.body.description).to.eql(expectedBookmark.description)
                })

        })
    })
})