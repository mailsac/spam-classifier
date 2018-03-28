function formatEmail ({ to = '', from = '', subject = '', text = '' }) {
  return `To: ${to}
From: ${from}
Subject: ${subject}
Text: ${text}`
}

module.exports = formatEmail
