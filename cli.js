#!/usr/bin/env node
process.title = 'mailsac_spam_trainer'
const fs = require('fs')
const sqlite3 = require('sqlite3')
const Classifier = require('./lib/classifier')
const program = require('commander')
const pkg = require('./package.json')

const classifier = new Classifier()
const saveEvery = 100
let fileContents = ''
let db

function loadClassifier (model) {
  console.log('loading classifier', model)
  classifier.load(model)
  console.log('classifier loaded')
}

function saveClassifier (model) {
  console.log('saving classifier')
  classifier.save(model)
  console.log('saved classifier')
}

program.version(pkg.version)

program.command('train <model>')
  .description('Train the classifier model')
  .option('--db [filepath]', 'Path to the JSON classifier model.')
  .option('--table [dbtable]',
    'The name of the table in the sqlite database. Must have the following fields: subject, text')
  .action((model, options) => {
    if (model && !fs.existsSync(model)) {
      console.log('creating model from scratch since it does not exist')
      classifier.save(model)
    }

    loadClassifier(model)

    console.log('loading database from', options.db)
    db = new sqlite3.Database(options.db)

    db.serialize(() => {
      console.log('training classifier on table', options.table)
      let counter = 0
      db.each(`SELECT * FROM ${options.table}`, (err, row) => {
        if (err) {
          console.error(err)
          return
        }
        // format some stuff
        let fileContents = ''
        if (row.subject) {
          fileContents += `Subject: ${row.subject}\n`
        }
        if (row.text) {
          fileContents += row.text
        }

        if (row.spam === 0) {
          console.log(counter, 'Training ham:', row.subject)
          classifier.trainHam(fileContents)
        } else if (row.spam === 1) {
          console.log(counter, 'Training spam:', row.subject)
          classifier.trainSpam(fileContents)
        } else {
          console.error('bad hamOrSpamInt', counter, row)
          return
        }

        counter++

        if (counter % saveEvery === 0 && counter !== 0) {
          saveClassifier(model)
        }
      })
    })

    db.close((err) => {
      if (err) {
        console.error('failed closing db', err)
        process.exit(1)
      }
      saveClassifier(model)
    })
  })

program.command('predict <model> <files...>')
  .description('Make a prediction using the contents of one or more email text files')
  .action((model, files) => {
    console.log('Testing prediction', { model, files })

    loadClassifier(model)

    let result = 0
    let currentFilePath
    for (let i = 0; i < files.length; i++) {
      currentFilePath = files[i]
      fileContents = fs.readFileSync(currentFilePath, 'utf-8')
      result = classifier.predict(fileContents)
      console.log(`Prediction for ${currentFilePath}: ${result} ${result > classifier.pValueSpamMinimum}`)
    }
  })

program.parse(process.argv)

if (!program.args.length) {
  program.help()
  process.exit()
}
