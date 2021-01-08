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

    describe(`Unauthorized requests`, () => {
        const bookmarks = makeBookmarksArray()

        beforeEach('insert bookmarks', () => {
            return db
              .into('bookmarks')
              .insert(bookmarks)
        })

        it(`responds with 401 Unauthorized for GET /api/bookmarks`, () => {
            return supertest(app)
              .get('/api/bookmarks')
              .expect(401, { error: 'Unauthorized request' })
          })
    
          it(`responds with 401 Unauthorized for GET /api/bookmarks/:id`, () => {
            const secondBookmark = bookmarks[1]
            return supertest(app)
              .get(`/api/bookmarks/${secondBookmark.id}`)
              .expect(401, { error: 'Unauthorized request' })
          })

          it(`responds with 401 Unauthorized for POST /api/bookmarks`, () => {
            return supertest(app)
                .post('/api/bookmarks')
                .send({
                    title: 'Test title',
                    url: 'http://test.com',
                    rating: 2
                })
                .expect(401, {error: 'Unauthorized request'})
          })

          it(`responds with 401 Unauthorized for DELETE /api/bookmarks/:id`, () => {
              const deleteBookmark = bookmarks[0]
              return supertest(app)
                .get(`/api/bookmarks/${deleteBookmark.id}`)
                .expect(401, {error: 'Unauthorized request'})
          })
    })


    describe(`Get /api/bookmarks`, () => {
        context('Given no bookmarks', () => {
            it(`responds with 200 and an empty list`, () => {
                return supertest(app)
                    .get('/api/bookmarks')
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
            it('GET /api/bookmarks responds with 200 and all of the bookmarks', () => {
                return supertest(app)
                    .get('/api/bookmarks')
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
                    .get('/api/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body[0].title).to.eql(expectedBookmark.title)
                        expect(res.body[0].description).to.eql(expectedBookmark.description)
                    })
            })
        })
    })
    describe(`GET /api/bookmarks/:id`, () => {
        context(`Given no bookmarks`, () => {
            it(`responds 404 when bookmark doesn't exist`, () => {
                const bookmarkId = 123456
              return supertest(app)
                .get(`/api/bookmarks/${bookmarkId}`)
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
            it(`GET /api/bookmarks/:id responds wiht 200 and the specified bookmark`, () => {
                const bookmarkId = 2
                const expectedBookmark = testBookmarks[bookmarkId - 1]
                return supertest(app)
                    .get(`/api/bookmarks/${bookmarkId}`)
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
                    .get(`/api/bookmarks/${maliciousBookmark.id}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body.title).to.eql(expectedBookmark.title)
                        expect(res.body.description).to.eql(expectedBookmark.description)
                    })
            })
        })
    })
    describe(`POST /api/bookmarks`, () => {
        it('adds a new bookmark to the database', () => {
            const newBookmark = {
              title: 'test-title',
              url: 'https://test.com',
              rating: 4,
              description: 'test description',
              
            }
            return supertest(app)
                .post(`/api/bookmarks`)
                .send(newBookmark)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(newBookmark.title)
                    expect(res.body.url).to.eql(newBookmark.url)
                    expect(res.body.description).to.eql(newBookmark.description)
                    expect(res.body.rating).to.eql(newBookmark.rating)
                    expect(res.body).to.have.property('id')
                    expect(res.headers.location).to.eql(`/api/bookmarks/${res.body.id}`)
                })
                .then(res =>
                    supertest(app)
                    .get(`/api/bookmarks/${res.body.id}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(res.body)
                )
        })
        it(`responds with 400 and an error message when the 'title' is missing`, () => {
            return supertest(app)
                .post('/api/bookmarks')
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
                .post('/api/bookmarks')
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
                .post('/api/bookmarks')
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
                .post('/api/bookmarks')
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
                .post('/api/bookmarks')
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
                .post('/api/bookmarks')
                .send(maliciousBookmark)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(expectedBookmark.title)
                    expect(res.body.description).to.eql(expectedBookmark.description)
                })

        })
    })

    describe(`DELETE /api/bookmarks/:id`, () => {
        context(`Given there are no bookmarks in the database`, () => {
            it(`responds with 404`, () => {
                const bookmarkId = 123456
                return supertest(app)
                    .delete(`/api/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, {error: {message: `Bookmark Not Found`}})
            })
        })
        context(`Given there are bookmarks in the database`, () => {
            const testBookmarks = makeBookmarksArray()
            beforeEach(`insert bookmarks`, () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            })
            it(`responds with 204 and removes the bookmark`, () => {
                const idToRemove = 2
                const expectedBookmarks = testBookmarks.filter(bookmark => bookmark.id !== idToRemove)
                return supertest(app)
                    .delete(`/api/bookmarks/${idToRemove}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(204)
                    .then(() => 
                        supertest(app)
                            .get(`/api/bookmarks`)
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedBookmarks)
                    )
            })
        })
    })
    describe(`PATCH /api/bookmarks/:id`, () => {
        context(`Given no bookmarks`, () => {
            it(`responds with 404`, () => {
                const articleId = 123456
                return supertest(app)
                    .patch(`/api/bookmarks/${articleId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, {error: { message: `Bookmark Not Found`}})
            })
        })
        context(`Given there are bookmarks in the database`, () => {
            const testBookmarks = makeBookmarksArray()
            beforeEach('insert articles', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            })
            it(`responds with 204 and updates the bookmark`, () => {
                const idToUpdate = 2
                const updateBookmark = {
                    title: 'updated title',
                    url: 'https://updatedurl.com',
                    rating: 4,
                    description: 'updated description',
                }
                const expectedBookmark = {
                    ...testBookmarks[idToUpdate - 1],
                    ...updateBookmark
                }
                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .send(updateBookmark)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(204)
                    .then(res => {
                        supertest(app)
                            .get(`/api/bookmarks/${idToUpdate}`)
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedBookmark)
                    })
            })
            it(`responds with 400 when no required fields supplies`, () => {
                const idToUpdate = 2
                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .send({irrelevantField: 'foo'})
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(400, {
                        error: {
                            message: `Request body must contain either 'title', 'url', or 'rating'`
                        }
                    })
            })
            it(`responds with 204 when updating only a subset of fields`, () => {
                const idToUpdate = 2
                const updateBookmark = {
                    title: 'updated bookmark title',
                }
                const expectedBookmark = {
                    ...testBookmarks[idToUpdate - 1],
                    ...updateBookmark
                }
                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .send({
                        ...updateBookmark,
                        fieldToIngor: 'should not be in GET response'
                    })
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(204)
                    .then(res => {
                        supertest(app)
                            .get(`/api/bookmarks/${idToUpdate}`)
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedBookmark)
                    })
            })
        })
    })
})