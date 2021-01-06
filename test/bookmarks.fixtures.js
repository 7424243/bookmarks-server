function makeBookmarksArray() {
    return [
        {
            id: 1,
            title: 'Test title one',
            url: 'http://www.testtitleone.com',
            description: 'test data number 1',
            rating: 4,
        },
        {
            id: 2,
            title: 'Test title two',
            url: 'http://www.testtitletwo.com',
            description: 'test data number 2',
            rating: 3,
        },
        {
            id: 3,
            title: 'Test title three',
            url: 'http://www.testtitlethree',
            description: 'test data number 3',
            rating: 5,
        },
    ]
}

module.exports = {
    makeBookmarksArray,
}