const NotificationService = require('../services/notification-service');
const notificationConfig = require('../config/notifications');

// Mock external services
const twilio = require('twilio');
const TelegramBot = require('node-telegram-bot-api');
const webpush = require('web-push');

jest.mock('twilio', () => {
    const mTwilio = {
        messages: {
            create: jest.fn().mockResolvedValue(true),
        },
    };
    return jest.fn(() => mTwilio);
});

jest.mock('node-telegram-bot-api', () => {
    const mTelegramBot = {
        sendMessage: jest.fn().mockResolvedValue(true),
    };
    return jest.fn(() => mTelegramBot);
});

jest.mock('web-push', () => ({
    setVapidDetails: jest.fn(),
    sendNotification: jest.fn().mockResolvedValue(true),
}));

// Mock the sendEmail function to prevent actual email sending
jest.spyOn(NotificationService, 'sendEmail').mockImplementation(() => Promise.resolve());


describe('NotificationService', () => {
    beforeEach(() => {
        // Reset mocks before each test
        twilio().messages.create.mockClear();
        TelegramBot().sendMessage.mockClear();
        webpush.sendNotification.mockClear();
        NotificationService.sendEmail.mockClear();
        // Reset push subscriptions
        NotificationService.pushSubscriptions = [];
    });

    it('should send SMS notifications', async () => {
        const originalEnabledState = notificationConfig.unknown_user.enabled;
        notificationConfig.unknown_user.enabled = true;

        // Temporarily add an SMS method for this test
        const tempSmsMethod = {
            type: 'sms',
            recipients: ['+1234567890'],
            template: 'Test SMS template for {{camera}}'
        };
        notificationConfig.unknown_user.methods.push(tempSmsMethod);

        await NotificationService.sendAlert('unknown_user', {
            camera: 'Test Cam',
            location: 'Test Location',
            timestamp: new Date().toISOString(),
            ip: '127.0.0.1',
            imagePath: 'test.jpg'
        });

        expect(twilio().messages.create).toHaveBeenCalledTimes(1);
        expect(twilio().messages.create).toHaveBeenCalledWith(expect.objectContaining({
            to: tempSmsMethod.recipients[0],
        }));

        // Cleanup: restore original config state
        notificationConfig.unknown_user.enabled = originalEnabledState;
        notificationConfig.unknown_user.methods = notificationConfig.unknown_user.methods.filter(
            m => m.type !== 'sms'
        );
    });

    it('should send Telegram notifications', async () => {
        const originalState = notificationConfig.thief_detected.enabled;
        notificationConfig.thief_detected.enabled = true;

        await NotificationService.sendAlert('thief_detected', {
            name: 'Test Thief',
            camera: 'Test Cam',
            location: 'Test Location',
            timestamp: new Date().toISOString(),
            ip: '127.0.0.1',
            imagePath: 'test.jpg'
        });

        const telegramConfig = notificationConfig.thief_detected.methods.find(m => m.type === 'telegram');
        expect(TelegramBot().sendMessage).toHaveBeenCalledTimes(telegramConfig.recipients.length);
        expect(TelegramBot().sendMessage).toHaveBeenCalledWith(telegramConfig.recipients[0], expect.any(String), { parse_mode: 'HTML' });

        notificationConfig.thief_detected.enabled = originalState; // Reset
    });

    it('should send push notifications', async () => {
        // Enable the notification for this test
        notificationConfig.new_user_detected.enabled = true;
        const subscription = { endpoint: 'test', keys: { p256dh: 'test', auth: 'test' } };
        NotificationService.addPushSubscription(subscription);

        await NotificationService.sendAlert('new_user_detected', {
            camera: 'Test Cam',
            location: 'Test Location',
            timestamp: new Date().toISOString(),
        });

        expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
        expect(webpush.sendNotification).toHaveBeenCalledWith(subscription, expect.any(String));

        // Disable it again to avoid side effects
        notificationConfig.new_user_detected.enabled = false;
    });
});
