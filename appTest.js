/* エントリーポイント */
'use strict';

const grkb = require('./scripts/crawlGrkbBlog.js');
const mbal = require('./scripts/scrapeMbal.js');
const sche = require('./scripts/mbalScheduledTweet.js');

let CronJob = require('cron').CronJob;

/** 
 * ごらくブログbot
 * 毎分30秒
 */
new CronJob('10,30,50 * * * * *', () => {
    grkb.crawlRss(true);
}, null, true, 'Asia/Tokyo');

/** 
 * モバアルbot
 * 8-24時 毎分0秒
 */
new CronJob('0,20,40 * * * * *', () => {
    mbal.scrape(true);
}, null, true, 'Asia/Tokyo' );

/**
 * モバアルbot 定期ツイート
 * 12-21時 3時間おき
 */
new CronJob('25 * * * * *', () => {
    sche.scheduledTweet(
        true, 
        new Date().getHours() + ':00 -【定期】本アカウントはモバイルアルビレックスの' +
        'コンテンツ・ニュース更新を確認しツイートする非公式の' +
        'botです。詳細は固定ツイートをご参照ください。\n#albirex'
    );
}, null, true, 'Asia/Tokyo');

/**
 * モバアルbot おはようツイート
 * 8時
 */
new CronJob('45 * * * * *', () => {
    sche.scheduledTweet(
        true,
        '8:00 -【定期】おはようございます。本日のモバアル更新確認を開始します。'
    );
}, null, true, 'Asia/Tokyo');

/**
 * モバアルbot おやすみツイート
 * 24時
 */
new CronJob('5 * * * * *', () => {
    sche.scheduledTweet(
        true,
        '24:00 -【定期】本日のモバアル更新確認を終了します。終了後に更新が' +
        'あった場合は再開時にまとめてツイートします。おやすみなさい。'
    );
}, null, true, 'Asia/Tokyo');