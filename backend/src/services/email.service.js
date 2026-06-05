const nodemailer = require('nodemailer');

const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS?.replace(/\s/g, '');
const smtpFrom = process.env.SMTP_FROM || smtpUser;

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports
    auth: {
        user: smtpUser,
        pass: smtpPass,
    },
});

const sendEmail = async ({ to, subject, text, html }) => {
    try {
        const info = await transporter.sendMail({
            from: smtpFrom, // sender address
            to, // list of receivers
            subject, // Subject line
            text, // plain text body
            html, // html body
        });

        console.log("Message sent: %s", info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("Error sending email: ", error);
        if (error?.code === 'EAUTH' && error?.responseCode === 535) {
            console.error(
                'Gmail rejected the SMTP credentials. Use the Gmail address as SMTP_USER and a current 16-character Google App Password as SMTP_PASS.'
            );
        }
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendEmail,
};
