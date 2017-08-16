'use strict';

/**
 * メールを送信
 * @param {string} head どこでエラーが起きたか
 * @param {Object} body エラーの内容
 */
exports.sendMail = (head, body) => {
    const nodemailer = require('nodemailer');

    //SMTPの設定
    let transporter = nodemailer.createTransport({
        host: 'smtp.mail.yahoo.co.jp',
        port: 465,
        secure: true, // secure:true for port 465, secure:false for port 587
        auth: {
            user: process.env.MAIL_ADDRESS_FROM,
            pass: process.env.MAIL_PASSWORD_FROM
        }
    });

    //メールの内容
    let mailOptions = {
        from: '"Heroku error notice" <' + process.env.MAIL_ADDRESS_FROM + '>',
        to: process.env.MAIL_ADDRESS_TO,
        subject: 'Heroku error notice', // Subject line
        text: head + JSON.stringify(body), // plain text body
        html: '<p>' + head + '</p>' + '<p>' + JSON.stringify(body) + '</p>' // html body
    };

    //メールの送信
    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.error(err);
        }
        console.log('Message %s sent: %s', info.messageId, info.response);
        return;
    });
};