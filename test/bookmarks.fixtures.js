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
            url: 'http://www.testtitlethree.com',
            description: 'test data number 3',
            rating: 5,
        },
    ]
}

function makeMaliciousBookmark() {
    const maliciousBookmark = {
        id: 911,
        title: 'Naughty naughty very naughty <script>alert("xss");</script>',
        url: 'http://www.maliciousurl.com',
        rating: 4,
        description: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
    }
    const expectedBookmark = {
        ...maliciousBookmark,
        title: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
        url: 'http://www.maliciousurl.com',
        rating: 4,
        description: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`,
    }
    return {
        maliciousBookmark,
        expectedBookmark
    }
}

module.exports = {
    makeBookmarksArray,
    makeMaliciousBookmark,
}