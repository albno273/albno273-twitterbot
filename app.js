/* エントリーポイント */
'use strict';

const grkb = require('./scripts/crawlGrkbBlog.js');
const mbal = require('./scripts/scrapeMbal.js');
const sche = require('./scripts/mbalScheduledTweet.js');

let CronJob = require('cron').CronJob;

// 定期ツイートの本文
const scheduled = 
    ':00 -【定期】本アカウントはモバイルアルビレックスの' +
    'コンテンツ・ニュース更新を確認しツイートする非公式の' +
    'botです。詳細は固定ツイートをご参照ください。\n#albirex';
const goodMorning = 
    '8:00 -【定期】おはようございます。本日のモバアル更新確認を開始します。';
const goodNight = 
    '24:00 -【定期】本日のモバアル更新確認を終了します。終了後に更新が' +
    'あった場合は再開時にまとめてツイートします。おやすみなさい。';

/** 
 * ごらくブログbot
 * 毎分30秒
 */
new CronJob('30 * * * * *', () => {
    grkb.crawl(false);
}, null, true, 'Asia/Tokyo');

/** 
 * モバアルbot
 * 8-24時 毎分0秒
 */
new CronJob('0 * 8-23 * * *', () => {
    mbal.scrape(false);
}, null, true, 'Asia/Tokyo');

/**
 * モバアルbot 定期ツイート
 * 12-21時 3時間おき
 */
new CronJob('0 0 12,15,18,21 * * *', () => {
    sche.scheduledTweet(false, new Date().getHours() + scheduled);
}, null, true, 'Asia/Tokyo');

/**
 * モバアルbot おはようツイート
 * 8時
 */
new CronJob('0 0 8 * * *', () => {
    sche.scheduledTweet(false, goodMorning);
}, null, true, 'Asia/Tokyo');

/**
 * モバアルbot おやすみツイート
 * 24時
 */
new CronJob('0 0 0 * * *', () => {
    sche.scheduledTweet(false, goodNight);
}, null, true, 'Asia/Tokyo');