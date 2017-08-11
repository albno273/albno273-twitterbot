/* モバアルbot 定期ツイート用 */
'use strict';

const twitter = require('twitter');

/**
 * 定期ツイート
 * @param {boolean} isDebug デバッグ用
 * @param {string} content ツイート本文
 */
exports.scheduledTweet = (isDebug, content) => {
    console.log('sche:', Date() + '\n' + content);
    defineBot(isDebug).post(
        'statuses/update',
        { status: content },
        err => {
            if (!err) {
                console.log('Reg tweet succeeded.');
            } else {
                console.log('An error occurred while tweeting:', err);
            }
        }
    );
};

/**
 * つぶやくアカウントを設定する
 * @param {boolean} isDebug デバッグ用
 */
function defineBot(isDebug) {
    if (isDebug) {
        return new twitter({
            consumer_key: process.env.DEBUG_CK,
            consumer_secret: process.env.DEBUG_CS,
            access_token_key: process.env.DEBUG_ATK,
            access_token_secret: process.env.DEBUG_ATS
        });
    } else {
        return new twitter({
            consumer_key: process.env.MBAL_CK,
            consumer_secret: process.env.MBAL_CS,
            access_token_key: process.env.MBAL_ATK,
            access_token_secret: process.env.MBAL_ATS
        });
    }
}