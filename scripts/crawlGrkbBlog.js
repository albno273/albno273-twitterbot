/* ごらくブログbot v2 */
'use strict';

const FeedParser = require('feedparser');
const request = require('request');
const commonFuncs = require('./commonFuncs.js');

// RSS の URL
const shioriRss = 'http://feedblog.ameba.jp/rss/ameblo/mikami-shiori/rss20.xml';
const yukaRss = 'http://www.earlywing.co.jp/category/blog/feed/';
const minamiRss = 'http://feedblog.ameba.jp/rss/ameblo/00dpd/rss20.xml';
const rumiRss = 'http://feedblog.ameba.jp/rss/ameblo/rumiokubo/rss20.xml';

/**
 * ごらく部のRSSフィードをクロール
 * @param {boolean} isDebug デバッグ用フラグ
 */
exports.crawlRss = async isDebug => {
    // 現時点の最新記事のタイトルとURL
    const recentTitles = await loadRecentTitle(isDebug);

    // 更新があったかどうか
    let haveUpdate = false;

    const shioriRes = await crawlRss(shioriRss);
    if (recentTitles.shiori.recent_title != shioriRes.title
        && recentTitles.shiori.previous_title != shioriRes.title) {
        saveRecentTitle(isDebug, 'shiori', shioriRes, recentTitles.shiori);
        tweetUpdate('三上枝織', shioriRes, isDebug);
        haveUpdate = true;
    }

    const yukaRes = await crawlRss(yukaRss);
    if (recentTitles.yuka.recent_title != yukaRes.title
        && recentTitles.yuka.previous_title != yukaRes.title
        && yukaRes.title.match(/大坪由佳/g)) {
        saveRecentTitle(isDebug, 'yuka', yukaRes, recentTitles.yuka);
        tweetUpdate('大坪由佳', yukaRes, isDebug);
        haveUpdate = true;
    }

    const minamiRes = await crawlRss(minamiRss);
    if (recentTitles.minami.recent_title != minamiRes.title
        && recentTitles.minami.previous_title != minamiRes.title) {
        saveRecentTitle(isDebug, 'minami', minamiRes, recentTitles.minami);
        tweetUpdate('津田美波', minamiRes, isDebug);
        haveUpdate = true;
    }

    const rumiRes = await crawlRss(rumiRss);
    if (recentTitles.rumi.recent_title != rumiRes.title
        && recentTitles.rumi.previous_title != rumiRes.title) {
        saveRecentTitle(isDebug, 'rumi', rumiRes, recentTitles.rumi);
        tweetUpdate('大久保瑠美', rumiRes, isDebug);
        haveUpdate = true;
    }

    if (!haveUpdate && isDebug) {
        console.log('grkb:', Date() + '\n' + 'Grkb blogs are up to date.');
    }
};

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
 * SQL テーブルから記事タイトルの一覧を取得
 * @param {boolean} isDebug デバッグ用
 * @return {Promise<{category: {title: string, url: string}}>} タイトルとURLのリスト
 */
async function loadRecentTitle(isDebug) {
    try {
        const client = commonFuncs.defineSql(isDebug);

        client.connect(err => {
            if (err) {
                console.error('Grkb:', Date() + '\n' +
                    'An error occurred while fetching SQL:', err);
                throw err;
            }
        });

        const result = await client.query(
            'SELECT name, recent_title, recent_url, previous_title FROM public.grkb'
        );
        let shiori, yuka, minami, rumi;
        result.rows.filter((item) => {
            if (item.name == 'shiori') {
                shiori = item;
            }
            if (item.name == 'yuka') {
                yuka = item;
            }
            if (item.name == 'minami') {
                minami = item;
            }
            if (item.name == 'rumi') {
                rumi = item;
            }
        });

        client.end();

        return new Object({
            shiori: shiori, yuka: yuka, minami: minami, rumi: rumi
        });
    } catch (err) {
        console.error(err);
    }
}

/**
 * 
 * @param {boolean} isDebug 
 * @param {string} name 
 * @param {{title: string, url: string}} newData 
 * @param {{recent_title: string, recent_url: string}} oldData
 */
async function saveRecentTitle(isDebug, name, newData, oldData) {
    try {
        const client = commonFuncs.defineSql(isDebug);

        client.connect(err => {
            if (err) {
                console.log('Mbal:', Date() + '\n' +
                    'An error occurred while fetching SQL:', err);
                throw err;
            }
        });

        await client.query(
            'UPDATE public.grkb '
            + 'SET recent_title = \'' + newData.title
            + '\', recent_url = \'' + newData.url
            + '\', previous_title = \'' + oldData.recent_title
            + '\', previous_url = \'' + oldData.recent_url
            + '\' WHERE name = \'' + name + '\''
        );

        client.end();
    } catch (err) {
        console.error(err);
    }
}

/**
 * ツイートする
 * @param {string} head 名前
 * @param {{title: string, url: string}} data エントリーの情報
 * @param {boolean} isDebug デバッグ用
 */
function tweetUpdate(head, data, isDebug) {
    const content = '【ブログ更新】' + head + ': ' + data.title + '\n' + data.url + ' #yuruyuri';
    console.log('grkb:', Date() + '\n' + content);
    commonFuncs.defineBot(isDebug, 'grkb').post(
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