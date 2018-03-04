/* モバアル更新チェック */
'use strict';

const cheerio = require('cheerio-httpcli');
const commonFuncs = require('./commonFuncs.js');
const mailer = require('./mailSender.js');

// HTML スクレイピング先
const urlSp = 'http://www.albirex.co.jp/sp/';
const urlPd = 'http://www.albirex.co.jp/news/photo_diary';

/**
 * モバアルをクロール
 * @param {boolean} isDebug デバッグ用フラグ
 */
exports.scrape = async isDebug => {
    try {
        // 現時点の最新記事のタイトルとURL
        const recentTitles = await loadRecentTitle(isDebug);
        // サイトに問い合わせした結果
        const spResult = await scrapeSpSite();
        const pdResult = await scrapePhotoDiary();

        // 更新があったかどうか
        let haveUpdate = false;

        if (spResult.beat.title != null
            && spResult.beat.title != recentTitles.beat.title) {
            tweetUpdate(isDebug, 'アルビの鼓動', spResult.beat);
            saveRecentTitle(isDebug, 'beat', spResult.beat);
            haveUpdate = true;
        }

        if (spResult.staff.title != null
            && spResult.staff.title != recentTitles.staff.title) {
            tweetUpdate(isDebug, '広報ダイアリー', spResult.staff);
            saveRecentTitle(isDebug, 'staff', spResult.staff);
            haveUpdate = true;
        }

        if (spResult.hayakawa.title != null
            && spResult.hayakawa.title != recentTitles.hayakawa.title) {
            tweetUpdate(isDebug, '早川史哉の前を向いて歩こう', spResult.hayakawa);
            saveRecentTitle(isDebug, 'hayakawa', spResult.hayakawa);
            haveUpdate = true;
        }

        if (spResult.holiday.title != null
            && spResult.holiday.title != recentTitles.holiday.title) {
            tweetUpdate(isDebug, 'アルビの休日', spResult.holiday);
            saveRecentTitle(isDebug, 'holiday', spResult.holiday);
            haveUpdate = true;
        }

        if (spResult.news.title != null
            && spResult.news.title != recentTitles.news.title) {
            tweetUpdate(isDebug, 'ニュース', spResult.news);
            saveRecentTitle(isDebug, 'news', spResult.news);
            haveUpdate = true;
        }

        if (spResult.academy.title != null
            && spResult.academy.title != recentTitles.academy.title) {
            tweetUpdate(isDebug, 'アカデミー', spResult.academy);
            saveRecentTitle(isDebug, 'academy', spResult.academy);
            haveUpdate = true;
        }

        if (pdResult.photo.title != null
            && pdResult.photo.title != recentTitles.photo.title) {
            tweetUpdate(isDebug, 'フォトダイアリー', pdResult.photo);
            saveRecentTitle(isDebug, 'photo', pdResult.photo);
            haveUpdate = true;
        }

        if (spResult.column.title != null
            && spResult.column.title != recentTitles.column.title) {
            tweetUpdate(isDebug, 'コラム', spResult.column);
            saveRecentTitle(isDebug, 'column', spResult.column);
            haveUpdate = true;
        }

        if (!haveUpdate && isDebug) {
            console.log(
                '=== MBAL:', Date(), '===\n' + 'Mbal contents are up to date.'
            );
        }
    } catch (err) {
        console.log('Error in scrapeMbal.scrape:', err);
        mailer.sendMail('Error in scrapeMbal.scrape:', err);
    }
};

/**
 * SPサイトのスクレイピング
 * @return {{category: {title: string, url: string}}} 最新タイトルとURL
 */
function scrapeSpSite() {
    return new Promise((resolve, reject) => {
        cheerio.fetch(urlSp, (err, $) => {
            if (!err) {
                // TODO: 文字列の切り出し方
                const recentMbalTitle = $('.whats-new-detail > .text').find('a').html()
                    .split('<br>')[1].replace('を更新しました', '').trim();
                const recentMbalUrl = $('.whats-new-detail').find('a').url();

                let beat = new Object({ title: null, url: null });
                let staff = new Object({ title: null, url: null });
                let hayakawa = new Object({ title: null, url: null });
                let holiday = new Object({ title: null, url: null });
                let column = new Object({ title: null, url: null });

                if (/albirex_beat/.test(recentMbalUrl)) {
                    beat = new Object({ title: recentMbalTitle, url: recentMbalUrl });
                } else if (/public_diary/.test(recentMbalUrl)) {
                    staff = new Object({ title: recentMbalTitle, url: recentMbalUrl });
                } else if (/hayakawa/.test(recentMbalUrl)) {
                    hayakawa = new Object({ title: recentMbalTitle, url: recentMbalUrl });
                }  else if (/holiday/.test(recentMbalUrl)) {
                    holiday = new Object({ title: recentMbalTitle, url: recentMbalUrl });
                } else if (/walk_way/.test(recentMbalUrl)) {
                    column = new Object({ title: recentMbalTitle.replace(/【コラム】/g, ''), url: recentMbalUrl });
                }

                const recentNews = $('.news > .category-detail > ul > li').eq(0);
                const recentAcademy = $('.academy-news > .category-detail > ul > li').eq(0);
                const news = new Object({
                    title: recentNews.find('span').text(),
                    url: recentNews.find('a').url()
                });
                const academy = new Object({
                    title: recentAcademy.find('span').text(),
                    url: recentAcademy.find('a').url()
                });

                resolve(new Object({
                    beat: beat, staff: staff, hayakawa: hayakawa, holiday: holiday,
                    news: news, academy: academy, column: column
                }));
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
 * @return {{category: {title: string, url: string}}} 最新タイトルとURL
 */
function scrapePhotoDiary() {
    return new Promise((resolve, reject) => {
        cheerio.fetch(urlPd, (err, $) => {
            if (!err) {
                resolve(new Object({
                    photo: {
                        title: $('.second-news-area').eq(0).find('a').eq(0).text(),
                        url: $('.second-news-area').eq(0).find('a').url()[1]
                    }
                }));
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
            'SELECT category, title, url FROM public.mbal'
        );
        let beat, staff, hayakawa, holiday, news, academy, photo, column;
        result.rows.filter((item) => {
            switch (item.category) {
            case 'beat':
                beat = item;
                break;
            case 'staff':
                staff = item;
                break;
            case 'hayakawa':
                hayakawa = item;
                break;
            case 'holiday':
                holiday = item;
                break;
            case 'news':
                news = item;
                break;
            case 'academy': 
                academy = item;
                break;
            case 'photo':
                photo = item;
                break;
            case 'column':
                column = item;
                break;
            }
        });

        client.end();

        return new Object({
            beat: beat, staff: staff, hayakawa: hayakawa, holiday: holiday,
            news: news, academy: academy, photo: photo, column: column
        });
    } catch (err) {
        console.log('Error in sccrapeMbal.loadRecentTitle:', err);
        mailer.sendMail('Error in scrapeMbal.loadRecentTitle:', err);
    }
}

/**
 * SQLのタイトルを更新
 * @param {boolean} isDebug デバッグ用
 * @param {string} category カテゴリ
 * @param {{title: string, url:string}} data タイトルとURL 
 */
async function saveRecentTitle(isDebug, category, data) {
    try {
        const client = commonFuncs.configureSqlTable(isDebug);
        data.title = data.title.replace(/'/g, '\'\'');

        client.connect(err => {
            if (err) {
                throw err;
            }
        });

        await client.query(
            'UPDATE public.mbal ' +
            'SET title = \'' + data.title +
            '\', url = \'' + data.url +
            '\' WHERE category = \'' + category + '\''
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
 * @param {string} header カテゴリ
 * @param {{title: string, url: string}} data ツイートの中身
 */
function tweetUpdate(isDebug, header, data) {
    try {
        let content = '【' + header + '】' + data.title.substr(0, 100) + '\n' + data.url + '\n#albirex';
        console.log('=== MBAL:', Date(), '===\n' + content);
        commonFuncs.configureTwitterAccount(isDebug, 'mbal').post(
            'statuses/update',
            { status: content },
            err => {
                if (!err) {
                    console.log('Tweet succeeded.');
                } else {
                    console.log('Error in scrapeMbal.tweetUpdate:', err);
                    mailer.sendMail('Error in scrapeMbal.tweetUpdate:', err);
                }
            }
        );
    } catch (err) {
        console.log('Error in scrapeMbal.tweetUpdate:', err);
        mailer.sendMail('Error in scrapeMbal.tweetUpdate:', err);
    }
}