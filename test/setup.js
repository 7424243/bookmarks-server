require('dotenv').config()
process.env.NODE_ENV = 'test'
const mocha = require('mocha')
const expect = require('chai').expect
const supertest = require('supertest')

global.expect = expect
global.supertest = supertest
global.mocha = mocha