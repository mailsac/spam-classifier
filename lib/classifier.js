const fs = require('fs')
const ignoredWords = require('./ignoredWords')

function Classifier () {
  // at this number or higher, the text is considered spam
  this.pValueSpamMinimum = 0.5
  // the internal data model of the classifier
  this.model = {
    spams: 0,
    hams: 0,
    spamq: {},
    hamq: {}
  }
}

Classifier.prototype.load = function (modelPath) {
  this.model = JSON.parse(fs.readFileSync(modelPath, 'utf-8'))
}

Classifier.prototype.save = function (modelPath) {
  fs.writeFileSync(modelPath, JSON.stringify(this.model, null, 2))
}

Classifier.prototype.isIgnored = function (word) {
  return ignoredWords.test(word)
}

Classifier.prototype.setupWordTable = function (sentences) {
  const table = {}
  const wordMatcher = /\b([a-z]{2,}-)*[a-z]{3,}/gi
  let result
  let word

  while ((result = wordMatcher.exec(sentences)) !== null) {
    word = result[0].toLowerCase()

    if (!this.isIgnored(word)) {
      table[word] = true
    }
  }

  return table
}

Classifier.prototype.trainSpam = function (sentences) {
  const table = this.setupWordTable(sentences)
  const total = this.model.spams

  let prevSpamQ

  Object.keys(this.model.spamq).forEach((word) => {
    prevSpamQ = this.model.spamq[word]

    if (table[word] === undefined) {
      this.model.spamq[word] = (total * prevSpamQ) / (total + 1)
      return
    }

    this.model.spamq[word] = (total * prevSpamQ + 1) / (total + 1)
    delete table[word]
  })

  Object.keys(table).forEach((word) => {
    this.model.spamq[word] = 1 / (total + 1)
  })

  this.model.spams = total + 1
}

Classifier.prototype.trainHam = function (sentences) {
  const table = this.setupWordTable(sentences)
  const total = this.model.hams

  let oldHamQ

  Object.keys(this.model.hamq).forEach((word) => {
    oldHamQ = this.model.hamq[word]

    if (table[word] === undefined) {
      this.model.hamq[word] = (total * oldHamQ) / (total + 1)
    } else {
      this.model.hamq[word] = (total * oldHamQ + 1) / (total + 1)
      delete table[word]
    }
  })

  Object.keys(table).forEach((word) => {
    this.model.hamq[word] = 1 / (total + 1)
  })

  this.model.hams = total + 1
}

Classifier.prototype.predict = function (sentences) {
  const table = this.setupWordTable(sentences)
  const prediction = {}
  let eta = 0
  let pValue = 0

  Object.keys(table).forEach((word) => {
    const spamq = this.model.spamq[word] || 0
    const hamq = this.model.hamq[word] || 0

    if (spamq !== 0 && hamq !== 0) {
      prediction[word] = spamq / (spamq + hamq)
    }
  })

  Object.keys(prediction).forEach((word) => {
    pValue = prediction[word]
    eta += (Math.log(1 - pValue) - Math.log(pValue))
  })

  const pValueFinal = 1 / (1 + Math.pow(Math.E, eta))

  return pValueFinal
}
module.exports = Classifier
