/* ごらくブログbot v2 */
'use strict';

const FeedParser = require('feedparser');
const request = require('request');
const cheerio = require('cheerio-httpcli');
const commonFuncs = require('./commonFuncs.js');
const mailer = require('./mailSender.js');

// RSS の URL
const shioriRss = 'http://feedblog.ameba.jp/rss/ameblo/mikami-shiori/rss20.xml';
const yukaBlog = 'http://earlywing.co.jp/ewblog/?cat=15';
const minamiRss = 'http://feedblog.ameba.jp/rss/ameblo/00dpd/rss20.xml';
const rumiRss = 'http://feedblog.ameba.jp/rss/ameblo/rumiokubo/rss20.xml';

/**
 * ごらく部のRSSフィードをクロール
 * @param {boolean} isDebug デバッグ用フラグ
 */
exports.crawl = async isDebug => {
    try {
        // 現時点の最新記事のタイトルとURL
        const recentTitles = await loadRecentTitle(isDebug);

        // 更新があったかどうか
        let haveUpdate = false;

        const shioriRes = await crawlRss(shioriRss);
        if (recentTitles.shiori.recent_title != shioriRes.title
            && recentTitles.shiori.previous_title != shioriRes.title) {
            tweetUpdate(isDebug, '三上枝織', shioriRes);
            saveRecentTitle(isDebug, 'shiori', shioriRes, recentTitles.shiori);
            haveUpdate = true;
        }

        const yukaRes = await scrape(yukaBlog);
        if (recentTitles.yuka.recent_title != yukaRes.title
            && recentTitles.yuka.previous_title != yukaRes.title
            && yukaRes.title.match(/大坪由佳/g)) {
            tweetUpdate(isDebug, '大坪由佳', yukaRes);
            saveRecentTitle(isDebug, 'yuka', yukaRes, recentTitles.yuka);
            haveUpdate = true;
        }

        const minamiRes = await crawlRss(minamiRss);
        if (recentTitles.minami.recent_title != minamiRes.title
            && recentTitles.minami.previous_title != minamiRes.title) {
            tweetUpdate(isDebug, '津田美波', minamiRes);
            saveRecentTitle(isDebug, 'minami', minamiRes, recentTitles.minami);
            haveUpdate = true;
        }

        const rumiRes = await crawlRss(rumiRss);
        if (recentTitles.rumi.recent_title != rumiRes.title
            && recentTitles.rumi.previous_title != rumiRes.title) {
            tweetUpdate(isDebug, '大久保瑠美', rumiRes);
            saveRecentTitle(isDebug, 'rumi', rumiRes, recentTitles.rumi);
            haveUpdate = true;
        }

        if (!haveUpdate && isDebug) {
            console.log(
                '=== GRKB:', Date(), '===\n' + 'Grkb blogs are up to date.'
            );
        }
    } catch (err) {
        console.log('Error in crawlGrkbBlog.crawl:', err);
        mailer.sendMail('Error in crawlGrkbBlog.crawl:', err);
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
            if (res.statusCode != 200) {
                reject(this.emit('error', new Error('Bad status code')));
            }
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
            console.log('Error in crawlGrkbBlog.crawlRss:', err);
            mailer.sendMail('Error in crawlGrkbBlog.crawlRss:', err);
            return err;
        });
}

/**
 * ゆかちん用スクレイピング
 */
function scrape(url) {
    return new Promise((resolve, reject) => {
        cheerio.fetch(url, (err, $) => {
            if (!err) {
                resolve(new Object({
                    title: $('#blog_title').eq(0).find('a').eq(0).text(),
                    url: $('#blog_title').eq(0).find('a').url()[0]
                }));
            } else {
                reject(err);
            }
        });
    })
        .catch(err => {
            console.log('Error in crawlGrkbBlog.scrape:', err);
            mailer.sendMail('Error in crawlGrkbBlog.scrape:', err);
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
        const client = commonFuncs.configureSqlTable(isDebug);

        client.connect(err => {
            if (err) {
                throw err;
            }
        });

        const result = await client.query(
            'SELECT name, recent_title, recent_url, previous_title FROM public.grkb'
        );
        let shiori, yuka, minami, rumi;
        result.rows.filter((item) => {
            switch (item.name) {
            case 'shiori':
                shiori = item;
                break;
            case 'yuka':
                yuka = item;
                break;
            case 'minami':
                minami = item;
                break;
            case 'rumi':
                rumi = item;
                break;
            }
        });

        client.end();

        return new Object({
            shiori: shiori, yuka: yuka, minami: minami, rumi: rumi
        });
    } catch (err) {
        console.log('Error in crawlGrkbBlog.loadRecentTitle:', err);
        mailer.sendMail('Error in crawlGrkbBlog.loadRecentTitle:', err);
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
        const client = commonFuncs.configureSqlTable(isDebug);
        newData.title = newData.title.replace(/'/g, '\'\'');
        oldData.recent_title = oldData.recent_title.replace(/'/g, '\'\'');

        client.connect(err => {
            if (err) {
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
        console.log('Error in crawlGrkbBlog.saveRecentTitle:', err);
        mailer.sendMail('Error in crawlGrkbBlog.saveRecentTitle:', err);
    }
}

/**
 * ツイートする
 * @param {boolean} isDebug デバッグなら true
 * @param {string} head 名前
 * @param {{title: string, url: string}} data エントリーの情報
 */
function tweetUpdate(isDebug, head, data) {
    try {
        const content = '【ブログ更新】' + head + ': ' + data.title.substr(0, 100) + '\n' + data.url + ' #yuruyuri';
        console.log('=== GRKB:', Date(), '===\n' + content);
        commonFuncs.configureTwitterAccount(isDebug, 'grkb').post(
            'statuses/update',
            { status: content },
            err => {
                if (err) {
                    console.log('Error in crawlGrkbBlog.tweetUpdate:', err);
                    mailer.sendMail('Error in crawlGrkbBlog.tweetUpdate:', err);
                } else {
                    console.log('Tweet succeeded.');
                }
            }
        );
    } catch (err) {
        console.log('Error in crawlGrkbBlog.tweetUpdate:', err);
        mailer.sendMail('Error in crawlGrkbBlog.tweetUpdate:', err);
    }
}