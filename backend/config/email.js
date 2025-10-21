// backend/config/email.js
const axios = require('axios');
const FROM_EMAIL = process.env.FROM_EMAIL;
const BREVO_API_KEY = process.env.BREVO_API_KEY;

async function sendEmail({ to, subject, html }) {
  await axios.post('https://api.brevo.com/v3/smtp/email', {
    sender: { email: FROM_EMAIL },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  }, {
    headers: { 'api-key': BREVO_API_KEY },
  });
}

module.exports = { sendEmail };
