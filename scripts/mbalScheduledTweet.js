/* モバアルbot 定期ツイート用 */
'use strict';

const commonFuncs = require('./commonFuncs.js');
const mailer = require('./mailSender.js');

/**
 * 定期ツイート
 * @param {boolean} isDebug デバッグなら true
 * @param {string} content ツイート本文
 */
exports.scheduledTweet = (isDebug, content) => {
    console.log('=== SCHE:', Date(), '===\n' + content);
    commonFuncs.configureTwitterAccount(isDebug, 'mbal').post(
        'statuses/update',
        { status: content },
        err => {
            if (!err) {
                console.log('Reg tweet succeeded.');
            } else {
                console.log('Error in mbalScheduledTweet.scheduledTweet:', err);
                mailer.sendMail('Error in mbalScheduledTweet.scheduledTweet:', err);
            }
        }
    );
};