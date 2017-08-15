'use strict';

const Twitter = require('twitter');
const { Client } = require('pg');

/**
 * 読み書きするSQLを設定する
 * @param {boolean} isDebug デバッグなら true
 * @return {{Client}} localhost か Heroku Postgres の設定
 */
exports.configureSqlTable = isDebug => {
    if (isDebug) {
        return new Client({
            host: 'localhost',
            user: process.env.LOCAL_SQL_USER,
            password: process.env.LOCAL_SQL_PW
        });
    } else {
        return new Client({
            connectionString: process.env.DATABASE_URL
        });
    }
};

/**
 * つぶやくアカウントを設定する
 * @param {boolean} isDebug デバッグなら true
 * @param {string} from どこから呼んでるか
 * @return {{Twitter}} CK/CS
 */
exports.configureTwitterAccount = (isDebug, from) => {
    if (isDebug) {
        return new Twitter({
            consumer_key: process.env.DEBUG_CK,
            consumer_secret: process.env.DEBUG_CS,
            access_token_key: process.env.DEBUG_ATK,
            access_token_secret: process.env.DEBUG_ATS
        });
    } else {
        switch (from) {
        case 'grkb':
            return new Twitter({
                consumer_key: process.env.GRKB_CK,
                consumer_secret: process.env.GRKB_CS,
                access_token_key: process.env.GRKB_ATK,
                access_token_secret: process.env.GRKB_ATS
            });
        case 'mbal':
            return new Twitter({
                consumer_key: process.env.MBAL_CK,
                consumer_secret: process.env.MBAL_CS,
                access_token_key: process.env.MBAL_ATK,
                access_token_secret: process.env.MBAL_ATS
            });
        }
    }
};