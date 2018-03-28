process.title = 'mailsac_spam_api'
const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const Classifier = require('./lib/classifier')
const formatEmail = require('./lib/formatEmail')

const modelPath = process.env.MODEL
const port = process.env.PORT || '3000'

const debug = console.log

if (!modelPath) {
  debug('Missing environment variable MODEL with path to a trained JSON model')
  process.exit(1)
}

const spamminessDecimalPlaces = 20 // to avoid scientific notation

const classifier = new Classifier()
classifier.load(modelPath)

debug('Loaded classifier from', modelPath)

const app = express()

app.use(morgan('tiny'))
app.disable('x-powered-by')

// parse application/json
app.use(bodyParser.json())

app.post('/api/spam-checks', function postSpamCheck (req, res) {
  const { to, from, subject, text } = req.body

  if (!to || !from || !subject || !text) {
    res.status(400)
      .send({
        url: req.url,
        message: 'The following JSON fields are required: to, from, subject, text'
      })
    return
  }

  const formattedEmail = formatEmail({ to, from, subject, text })
  const spamminess = classifier.predict(formattedEmail)
    .toFixed(spamminessDecimalPlaces)

  debug('prediction', spamminess, { to, from, subject })

  // avoid scientific notation in JSON for readability
  // express will parse it, if it knows it is application/json
  const body = `{
  "spamminess": ${spamminess},
  "spam": ${spamminess > classifier.pValueSpamMinimum}
}`
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Content-Length': body.length,
    // RCF-1123
    'Date': new Date().toUTCString()
  })
  res.end(body)
})

app.use(function handle404 (req, res) {
  res.status(404)
    .send({ url: req.url, message: 'Route not matched' })
})

app.use(function lastErrorHandler (err, req, res, next) {
  debug('error', err.message, err.stack, err.code)
  res.status(500)
    .send({
      url: req.url,
      message: err.message,
      stack: err.stack,
      code: err.code
    })
})

app.on('error', (err) => {
  debug('failed starting up', err)
  process.exit(1)
})

app.listen(port, () => {
  debug('spam server is listening on port', port)
})
