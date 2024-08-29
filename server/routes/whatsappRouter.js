// whatsappRouter.js
const express = require('express');
const router = express.Router();
const twilio = require('twilio');


const client = twilio(accountSid, authToken);

router.post('/send-whatsapp', (req, res) => {
    const { message, to } = req.body;

    client.messages
        .create({
            body: message,
            from: 'whatsapp:+14155238886', // Your Twilio WhatsApp number
            to: `whatsapp:${to}` // Recipient's WhatsApp number
        })
        .then((msg) => {
            res.status(200).json({ success: true, sid: msg.sid });
        })
        .catch((err) => {
            res.status(500).json({ success: false, error: err.message });
        });
});

module.exports = router;
