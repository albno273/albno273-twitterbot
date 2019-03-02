/* モバアル更新チェック */
'use strict';

const cheerio = require('cheerio-httpcli');
const commonFuncs = require('./commonFuncs.js');
const mailer = require('./mailSender.js');

// HTML スクレイピング先
const mbalzUrl = 'https://z.albirex.co.jp/pages/all';
const newsUrl = 'http://www.albirex.co.jp/news/';

/**
 * モバアルをクロール
 * @param {boolean} isDebug デバッグ用フラグ
 */
exports.scrape = async isDebug => {
    try {
        // 現時点の最新記事のタイトルとURL
        const recentArticles = await loadRecentTitle(isDebug);
        
        // サイトに問い合わせした結果
        const mbalzScrapeResult = await scrapeSpSite();
        const newsScrapeResult = await scrapeNews();


        // 更新があったかどうか
        let haveUpdate = false;

        if (recentArticles.mbalz.url != mbalzScrapeResult.url && 
            mbalzScrapeResult.url != undefined) {
            tweetUpdate(isDebug, mbalzScrapeResult);
            saveRecentTitle(isDebug, mbalzScrapeResult);
            haveUpdate = true;
        }

        if (recentArticles.news.url != newsScrapeResult.url &&
            newsScrapeResult.url != undefined) {
            tweetUpdate(isDebug, newsScrapeResult);
            saveRecentTitle(isDebug, newsScrapeResult);
            haveUpdate = true;
        }

        if (!haveUpdate) {
            console.log(
                '=== MBAL:', Date(), '===\n' + 'Mbal contents are up to date.'
            );
        }
    } catch (err) {
        console.log('Error in scrapeMbal.scrape:', err);
    }
};

/**
 * SPサイトのスクレイピング
 * @return Promise<{category: string, title: string, url: string}> 最新カテゴリとタイトルとURL
 */
async function scrapeSpSite() {
    return new Promise((resolve, reject) => {
        cheerio.fetch(mbalzUrl, (err, $) => {
            if (!err) {
                const category = $('.thumbnail-list-category').eq(0).text().trim().replace(/\s{2,}/g, ",");
                const title = $('.thumbnail-list-image').eq(0).find('img').attr('alt');
                const url = $('.thumbnail-list-item').eq(0).find('a').url();

                resolve({ category: category, title: title, url: url, site: 'z' });
            } else {
                reject(err);
            }
        });
    })
        .catch(err => {
            console.log('Error in scrapeMbal.scrapeSpSite:', err);
            mailer.sendMail('Error in scrapeMbal.scrapeSpSite:', err, isDebug);
            return err;
        });
}

/**
 * PCサイトのスクレイピング
 * @return Promise<{category: string, title: string, url: string}> 最新タイトルとURL
 */
async function scrapeNews() {
    return new Promise((resolve, reject) => {
        cheerio.fetch(newsUrl, (err, $) => {
            if (!err) {
                const news = $('.item-news > .ui-news > ul > li');
                let category = '';
                const categoryDom = news.find('.category').eq(0).find('a');
                const title = news.find('b > a').eq(0).text();
                const url = news.find('b > a').url()[0];

                for (let i = 0; i < categoryDom.length; i++) {
                    let categoryStr = categoryDom.eq(i).text();
                    if (i == 0) {
                        category += categoryStr;
                    } else {
                        category += ',' + categoryStr;
                    }
                };

                resolve({ category: category, title: title, url: url, site: 'p'});
            } else {
                reject(err);
            }
        });
    })
        .catch(err => {
            console.log('Error in sccrapeMbal.scrapeNews:', err);
            mailer.sendMail('Error in scrapeMbal.scrapeNews:', err, isDebug);
            return err;
        });
}

/**
 * SQL テーブルから記事タイトルの一覧を取得
 * @param {boolean} isDebug デバッグ用
 * @return {Promise<{ mbalz: { category: string, title: string, url: string }, news: { title: string, url: string }}>} タイトルとURLのリスト
 */
async function loadRecentTitle(isDebug) {
    try {
        const client = commonFuncs.configureSqlTable(isDebug);

        client.connect(err => {
            if (err) {
                throw err;
            }
        });

        let mbalzRecent = await client.query(
            'SELECT category, title, url, site ' +
            'FROM public.mbalz ' +
            "WHERE site = 'z' " +
	        'ORDER BY update_time DESC ' +
	        'LIMIT 1;'
        );

        if(mbalzRecent.rows[0] == undefined) {
            mbalzRecent = { category: '', title: '', url: '', site: 'z' };
        } else {
            mbalzRecent = mbalzRecent.rows[0];
        }

        let newsRecent = await client.query(
            'SELECT category, title, url, site ' +
            'FROM public.mbalz ' +
            "WHERE site = 'p' " +
            'ORDER BY update_time DESC ' +
            'LIMIT 1;'
        );

        if (newsRecent.rows[0] == undefined) {
            newsRecent = { category: '', title: '', url: '', site: 'p' };
        } else {
            newsRecent = newsRecent.rows[0];
        }

        return { mbalz: mbalzRecent, news: newsRecent };
    } catch (err) {
        console.log('Error in sccrapeMbal.loadRecentTitle:', err);
        mailer.sendMail('Error in scrapeMbal.loadRecentTitle:', err, isDebug);
    }
}

/**
 * SQLのタイトルを更新
 * @param {boolean} isDebug デバッグ用
 * @param {{ category: string, title: string, url: string }} data タイトルとURL 
 */
async function saveRecentTitle(isDebug, data) {
    try {
        const client = commonFuncs.configureSqlTable(isDebug);

        client.connect(err => {
            if (err) {
                throw err;
            }
        });

        const d = new Date();
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const day = d.getDate();
        const hour = (d.getHours() < 10) ? '0' + d.getHours() : d.getHours();
        const min = (d.getMinutes() < 10) ? '0' + d.getMinutes() : d.getMinutes();
        const sec = (d.getSeconds() < 10) ? '0' + d.getSeconds() : d.getSeconds();
        const timestamp = year + '-' + month + '-' + day + ' ' + hour + ':' + min + ':' + sec;

        await client.query(
            'INSERT INTO public.mbalz' +
            '(category, title, url, update_time, site) ' +
	        `VALUES('${data.category}', '${data.title}', '${data.url}', '${timestamp}', '${data.site}');`
        );

        client.end();
    } catch (err) {
        console.log('Error in sccrapeMbal.saveRecentTitle:', err);
        mailer.sendMail('Error in scrapeMbal.saveRecentTitle:', err, isDebug);
    }
}

/**
 * ツイートする
 * @param {boolean} isDebug デバッグ用
 * @param {{ category: string, title: string, url: string }} data ツイートの中身
 */
function tweetUpdate(isDebug, data) {
    try {
        const categoryArr = data.category.split(',');
        let categoryStr = '';

        categoryArr.forEach(element => {
            categoryStr += `[${element}] `
        });

        let content = `${categoryStr}${data.title.substr(0, 100)}\n${data.url}\n#albirex`;
        console.log('=== MBAL:', Date(), '===\n' + content);
        if (!isDebug) {
            commonFuncs.configureTwitterAccount(isDebug, 'mbal').post(
                'statuses/update',
                { status: content },
                err => {
                    if (!err) {
                        console.log('Tweet succeeded.');
                    } else {
                        console.log('Error in scrapeMbal.tweetUpdate:', err);
                    }
                }
            );
        }
    } catch (err) {
        console.log('Error in scrapeMbal.tweetUpdate:', err);
        mailer.sendMail('Error in scrapeMbal.tweetUpdate:', err, isDebug);
    }
}