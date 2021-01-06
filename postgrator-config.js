require('dotenv').config()

module.exports = {
    "migrationsDirectory" : "migrattions",
    "driver": 'pg',
    "connectionString": process.env.DB_URL,
}