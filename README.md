# spam-classifier - CLI trainer and API server

This is a naive bayes spam classifier, trainer, and API server all rolled into one. It is not sophisticated but it works well for blocking basic email, comment or other text based spam.

# Usage

## Classifier Library

```javascript
const Classifier = require('spam-classifier').Classifier

const classifier = new Classifier()
classifier.load('path/to/model.json')

const spammyText = `Subject: hey there\nYou won the lottery!`
const hammyText = `Subject: check out my npm module\nIt is published live!`

classifier.trainSpam(spammyText)
classifier.trainHam(hammyText)

const result = classifier.predict('Am I a spam bot?') // true or false
```

## CLI tool

```
# must be a path to a sqlite database
node cli.js train data/model.json --db=~/spam.sqlite --table=emails

node cli.js predict data/model.json file1.eml file2.eml file3.eml
```

## Spam API Server

```
$ MODEL=data/model.json PORT=3000 node server.js

Loaded classifier from data/model.json
spam server is listening on port 3000
```

Request example:

```
POST http://localhost:3000/api/spam-checks
{
    to: 'asdf@mailsac.com',
    from: 'jkl@mailsac.com',
    subject: 'hey',
    text: 'yo'
}
```

response example:

```
{
    spam: false,
    spamminess: 0.193776
}
```

# License

MIT

See LICENSE file in this repository.
