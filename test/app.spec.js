const app = require('../src/app')
const {bookmarks} = require('../src/store')

describe('App', () => {
    it('GET / responds with 200 containing "Hello, world!"', () => {
        return supertest(app).get('/').expect(200, 'Hello, world!')
    })
})