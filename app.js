/* エントリーポイント */
'use strict';

const grkb = require('./scripts/crawlGrkbBlog.js');
const mbal = require('./scripts/scrapeMbal.js');
const sche = require('./scripts/mbalScheduledTweet.js');

let CronJob = require('cron').CronJob;

// 定期ツイートの本文
const scheduled = 
    ':00 -【定期】本アカウントは「モバアルZ」の' +
    'コンテンツ・ニュース更新を確認しツイートする非公式の' +
    'botです。詳細は固定ツイートをご参照ください。\n#albirex';

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
new CronJob('0 * * * * *', () => {
    mbal.scrape(false);
}, null, true, 'Asia/Tokyo');

/**
 * モバアルbot 定期ツイート
 * 6時間おき
 */
new CronJob('0 0 0,6,12,18 * * *', () => {
    sche.scheduledTweet(false, new Date().getHours() + scheduled);
}, null, true, 'Asia/Tokyo');