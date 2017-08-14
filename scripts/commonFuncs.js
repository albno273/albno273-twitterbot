'use strict';

const { Client } = require('pg');
const twitter = require('twitter');

/**
 * 読み込む SQL テーブル先を設定する
 * @param {boolean} isDebug デバッグ用
 * @return {{Client}} SQLの接続設定
 */
exports.defineSql = isDebug => {
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
 * @param {boolean} isDebug デバッグ用
 * @param {string} from どこから呼んでるか
 * @return {{twitter}} クライアントのCK/CS
 */
exports.defineBot = (isDebug, from) => {
    if (isDebug) {
        return new twitter({
            consumer_key: process.env.DEBUG_CK,
            consumer_secret: process.env.DEBUG_CS,
            access_token_key: process.env.DEBUG_ATK,
            access_token_secret: process.env.DEBUG_ATS
        });
    } else {
        switch (from) {
        case 'grkb':
            return new twitter({
                consumer_key: process.env.GRKB_CK,
                consumer_secret: process.env.GRKB_CS,
                access_token_key: process.env.GRKB_ATK,
                access_token_secret: process.env.GRKB_ATS
            });
        case 'mbal':
            return new twitter({
                consumer_key: process.env.MBAL_CK,
                consumer_secret: process.env.MBAL_CS,
                access_token_key: process.env.MBAL_ATK,
                access_token_secret: process.env.MBAL_ATS
            });
        }
    }
};