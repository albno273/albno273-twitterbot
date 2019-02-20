/* モバアル更新チェック */
'use strict';

const cheerio = require('cheerio-httpcli');
const commonFuncs = require('./commonFuncs.js');
const mailer = require('./mailSender.js');

// HTML スクレイピング先
const mbalzUrl = 'https://z.albirex.co.jp/updates';
const photoDiaryUrl = 'http://www.albirex.co.jp/news/photo_diary';

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
        const photoDiaryScrapeResult = await scrapePhotoDiary();

        // 更新があったかどうか
        let haveUpdate = false;

        if (recentArticles.mbalz.url != mbalzScrapeResult.url) {
            tweetUpdate(isDebug, mbalzScrapeResult);
            saveRecentTitle(isDebug, mbalzScrapeResult);
            haveUpdate = true;
        }

        if (recentArticles.photoDiary.url != photoDiaryScrapeResult.url) {
            tweetUpdate(isDebug, photoDiaryScrapeResult);
            saveRecentTitle(isDebug, photoDiaryScrapeResult);
            haveUpdate = true;
        }

        if (!haveUpdate && isDebug) {
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
                const title = $('.thumbnail-list-image').find('img').attr('alt');
                const url = $('.thumbnail-list-item').eq(0).find('a').url();

                resolve({ category: category, title: title, url: url });
            } else {
                reject(err);
            }
        });
    })
        .catch(err => {
            console.log('Error in scrapeMbal.scrapeSpSite:', err);
            mailer.sendMail('Error in scrapeMbal.scrapeSpSite:', err);
            return err;
        });
}

/**
 * PCサイト フォトダイアリーのスクレイピング
 * @return Promise<{category: 'フォト日記', title: string, url: string}> 最新タイトルとURL
 */
async function scrapePhotoDiary() {
    return new Promise((resolve, reject) => {
        cheerio.fetch(photoDiaryUrl, (err, $) => {
            if (!err) {
                const category = 'フォト日記'
                const title = $('.second-news-area').eq(0).find('a').eq(0).text();
                const url = $('.second-news-area').eq(0).find('a').url()[1];

                resolve({ category: category, title: title, url: url});
            } else {
                reject(err);
            }
        });
    })
        .catch(err => {
            console.log('Error in sccrapeMbal.scrapePhotoDiary:', err);
            mailer.sendMail('Error in scrapeMbal.scrapePhotoDiary:', err);
            return err;
        });
}

/**
 * SQL テーブルから記事タイトルの一覧を取得
 * @param {boolean} isDebug デバッグ用
 * @return {Promise<{ mbalz: { category: string, title: string, url: string }, photoDiary: { title: string, url: string }}>} タイトルとURLのリスト
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
            'SELECT category, title, url ' +
            'FROM public.mbalz ' +
            "WHERE category != 'photo_diary' " +
	        'ORDER BY update_time DESC ' +
	        'LIMIT 1;'
        );

        if(mbalzRecent.rows[0] == undefined) {
            mbalzRecent = { category: '', title: '', url: '' };
        } else {
            mbalzRecent = mbalzRecent.rows[0];
        }

        let photoDiaryRecent = await client.query(
            'SELECT category, title, url ' +
            'FROM public.mbalz ' +
            "WHERE category = 'フォト日記' " +
            'ORDER BY update_time DESC ' +
            'LIMIT 1;'
        );

        if (photoDiaryRecent.rows[0] == undefined) {
            photoDiaryRecent = { category: 'フォト日記', title: '', url: '' };
        } else {
            photoDiaryRecent = photoDiaryRecent.rows[0];
        }

        return { mbalz: mbalzRecent, photoDiary: photoDiaryRecent };
    } catch (err) {
        console.log('Error in sccrapeMbal.loadRecentTitle:', err);
        mailer.sendMail('Error in scrapeMbal.loadRecentTitle:', err);
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
            '(category, title, url, update_time) ' +
	        `VALUES('${data.category}', '${data.title}', '${data.url}', '${timestamp}');`
        );

        client.end();
    } catch (err) {
        console.log('Error in sccrapeMbal.saveRecentTitle:', err);
        mailer.sendMail('Error in scrapeMbal.saveRecentTitle:', err);
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
            categoryStr += `【${element}】`
        });

        let content = `${categoryStr}${data.title.substr(0, 100)}\n${data.url}\n#albirex`;
        console.log('=== MBAL:', Date(), '===\n' + content);

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
    } catch (err) {
        console.log('Error in scrapeMbal.tweetUpdate:', err);
        mailer.sendMail('Error in scrapeMbal.tweetUpdate:', err);
    }
}