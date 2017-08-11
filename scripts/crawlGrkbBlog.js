/* ごらくブログbot v2 */
'use strict';

const twitter = require('twitter');
const fs = require('fs');
const FeedParser = require('feedparser');
const request = require('request');

/**
 * ごらく部のRSSフィードをクロール
 * @param {boolean} isDebug デバッグ用フラグ
 */
exports.crawlRss = async isDebug => {
    // RSS の URL
    const shioriRss = 'http://feedblog.ameba.jp/rss/ameblo/mikami-shiori/rss20.xml';
    const yukaRss = 'http://www.earlywing.co.jp/category/blog/feed/';
    const minamiRss = 'http://feedblog.ameba.jp/rss/ameblo/00dpd/rss20.xml';
    const rumiRss = 'http://feedblog.ameba.jp/rss/ameblo/rumiokubo/rss20.xml';

    // 最新記事のタイトル
    const text = await fs.readFileSync(process.env.GRKB_LOG, { encoding: 'utf8' });
    const recentEntrys = text.replace(/\r/g, '').split('\n');
    const shioriRecent = recentEntrys[0];
    const yukaRecent = recentEntrys[1];
    const minamiRecent = recentEntrys[2];
    const rumiRecent = recentEntrys[3];

    // 更新があったかどうか
    let haveUpdate = false;

    const shioriRes = await crawlRss(shioriRss);
    if (shioriRecent != shioriRes.title) {
        tweetUpdate('三上枝織', shioriRes, isDebug);
        haveUpdate = true;
    }

    const yukaRes = await crawlRss(yukaRss);
    if (yukaRecent != yukaRes.title && yukaRes.title.match(/大坪由佳/g)) {
        tweetUpdate('大坪由佳', yukaRes, isDebug);
        haveUpdate = true;
    }

    const minamiRes = await crawlRss(minamiRss);
    if (minamiRecent != minamiRes.title) {
        tweetUpdate('津田美波', minamiRes, isDebug);
        haveUpdate = true;
    }

    const rumiRes = await crawlRss(rumiRss);
    if (rumiRecent != rumiRes.title) {
        tweetUpdate('大久保瑠美', rumiRes, isDebug);
        haveUpdate = true;
    }

    if (haveUpdate) {
        await updateLog(shioriRes.title, yukaRes.title, minamiRes.title, rumiRes.title);
    } else {
        if(isDebug) {
            console.log('grkb:', Date() + '\n' + 'Grkb blogs are up to date.');
        }
    }
};

/**
 * ツイートする
 * @param {string} head 名前
 * @param {{title: string, url: string}} data エントリーの情報
 * @param {boolean} isDebug デバッグ用
 */
function tweetUpdate(head, data, isDebug) {
    const content = '【ブログ更新】' + head + ': ' + data.title + '\n' + data.url + ' #yuruyuri';
    console.log('grkb:', Date() + '\n' + content);
    defineBot(isDebug).post(
        'statuses/update',
        { status: content },
        err => {
            if (err) {
                console.log('An error occurred while tweeting:', err);
            } else {
                console.log('Tweet succeeded.');
            }
        }
    );
}

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
            consumer_key: process.env.GRKB_CK,
            consumer_secret: process.env.GRKB_CS,
            access_token_key: process.env.GRKB_ATK,
            access_token_secret: process.env.GRKB_ATS
        });
    }
}

/**
 * RSSフィードの確認
 * @param {string} url RSS の URL
 * @returns {{title: string, url: string}} 最新記事のタイトルと URL
 */
function crawlRss(url) {
    return new Promise((resolve, reject) => {
        const fp_req = request(url);
        const feedparser = new FeedParser();
        let items = [];

        fp_req.on('error', err => {
            reject(err);
        });

        fp_req.on('response', function (res) {
            // TODO: rewrite 'this' in arrow function
            let stream = this;
            if (res.statusCode != 200)
                reject(this.emit('error', new Error('Bad status code')));
            stream.pipe(feedparser);
        });

        feedparser.on('error', err => {
            reject(err);
        });

        feedparser.on('readable', function () {
            // TODO: rewrite 'this' in arrow function
            const item = this.read();
            items.push(item);
        });

        feedparser.on('end', () => {
            resolve(new Object({ title: items[0].title, url: items[0].link }));
        });
    })
        .catch(err => {
            console.log('grkb:', Date() + '\n' +
                'An error occurred while crawling RSS feed:', err);
            return err;
        });
}

/**
 * ログファイルのアップデート
 * @param {string} shiori みかしーのブログの最新タイトル
 * @param {string} yuka ゆかちんのブログの最新タイトル
 * @param {string} minami 津田ちゃんのブログの最新タイトル
 * @param {string} rumi るみるみのブログの最新タイトル
 */
function updateLog(shiori, yuka, minami, rumi) {
    return new Promise((resolve, reject) => {
        const text = shiori + '\n' + yuka + '\n' + minami + '\n' + rumi;
        fs.writeFileSync(process.env.GRKB_LOG, text, err => {
            if (!err) {
                resolve();
            } else {
                reject(err);
            }
        });
    })
        .catch(err => {
            console.log('grkb:', Date() + '\n' +
                'An error occurred while updating log file:', err);
            return err;
        });
}