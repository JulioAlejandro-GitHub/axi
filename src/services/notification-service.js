const { queryExe } = require('../database/config');
const notificationConfig = require('../../config/notifications');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const TelegramBot = require('node-telegram-bot-api');
const webpush = require('web-push');
const logger = require('../helpers/logger');

// TODO: Move configuration to environment variables
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const telegramBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

// TODO: Move VAPID keys to a separate config file and use environment variables.
const vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY
};

if (vapidKeys.publicKey && vapidKeys.privateKey) {
    webpush.setVapidDetails(
        'mailto:example@yourdomain.org',
        vapidKeys.publicKey,
        vapidKeys.privateKey
    );
} else {
    logger.warn('VAPID keys not configured. Push notifications will be disabled.');
}

// TODO: Move transporter configuration to a separate config file and use environment variables.
const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
        user: 'reyna.bogan@ethereal.email',
        pass: 'g29n5nZa2tJBrR2g1C'
    }
});

class NotificationService {
    constructor() {
        this.pushSubscriptions = []; // In-memory store for push subscriptions
    }

    addPushSubscription(subscription) {
        this.pushSubscriptions.push(subscription);
    }

    async sendAlert(alertType, data) {
        const originalConfig = notificationConfig[alertType];
        if (!originalConfig || !originalConfig.enabled) {
            logger.debug(`Notification type ${alertType} is disabled or not configured.`);
            return;
        }
        
        // Deep copy the config to prevent runtime modifications from affecting other alerts.
        const config = JSON.parse(JSON.stringify(originalConfig));

        for (const method of config.methods) {
            const message = this.formatMessage(method.template, data);
            switch (method.type) {
                case 'email':
                    await this.sendEmail(method, data, config.subject);
                    break;
                case 'push':
                    await this.sendPushNotification(message);
                    break;
                case 'sms':
                    await this.sendSms(method, message);
                    break;
                case 'telegram':
                    await this.sendTelegram(method, message, data);
                    break;
                case 'whatsapp':
                    // Placeholder for WhatsApp logic
                    logger.debug('WhatsApp notification not implemented yet.');
                    break;
                default:
                    logger.debug(`Unknown notification method: ${method.type}`);
            }
        }
    }

    async sendEmail(methodConfig, data, subject) {
        const mailOptions = {
            from: '"Vigilante IA" <noreply@vigilante-ia.com>',
            to: methodConfig.recipients.join(','),
            subject: subject,
            html: this.formatMessage(methodConfig.template, data),
        };

        try {
            let info = await transporter.sendMail(mailOptions);
            logger.debug('Email sent: %s', info.messageId);
            logger.debug('Preview URL: %s', nodemailer.getTestMessageUrl(info));
        } catch (error) {
            logger.error('Error sending email:', error);
        }
    }

    async sendSms(methodConfig, message) {
        for (const recipient of methodConfig.recipients) {
            try {
                await twilioClient.messages.create({
                    body: message,
                    from: 'your_twilio_phone_number',
                    to: recipient
                });
                logger.debug(`SMS sent to ${recipient}`);
            } catch (error) {
                logger.error(`Error sending SMS to ${recipient}:`, error);
            }
        }
    }

    async sendTelegram(methodConfig, message, data) {
        let recipients = methodConfig.recipients; // Default to config recipients

        if (data.camera && data.camera.local_id) {
            try {
                const query = `
                    SELECT telegram_chat_id
                    FROM usuario
                    WHERE local_id = ?
                      AND (tipo = 'socio' OR tipo = 'familia')
                      AND telegram_chat_id IS NOT NULL
                `;
                const users = await queryExe(query, [data.camera.local_id]);

                if (users && users.length > 0) {
                    recipients = users.map(user => user.telegram_chat_id);
                } else {
                    logger.debug(`No Telegram recipients found for local_id: ${data.camera.local_id}`);
                    return; // No recipients, so no message to send
                }
            } catch (dbError) {
                logger.error('Error fetching Telegram recipients from database:', dbError);
                // Optionally, fall back to default recipients or just return
                return;
            }
        }

        for (const recipient of recipients) {
            try {
                await telegramBot.sendMessage(recipient, message, { parse_mode: 'HTML' });
                logger.debug(`Telegram message sent to ${recipient}`);
            } catch (error) {
                logger.error(`Error sending Telegram message to ${recipient}:`, error);
            }
        }
    }

    async sendPushNotification(payload) {
        for (const subscription of this.pushSubscriptions) {
            try {
                await webpush.sendNotification(subscription, payload);
                logger.debug('Push notification sent.');
            } catch (error) {
                logger.error('Error sending push notification:', error);
            }
        }
    }

    formatMessage(template, data) {
        let content = template;
        for (const key in data) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            content = content.replace(regex, data[key]);
        }
        return content;
    }
}

module.exports = new NotificationService();