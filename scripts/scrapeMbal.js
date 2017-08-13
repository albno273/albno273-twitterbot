/* モバアル更新チェック */

'use strict';

const cheerio = require('cheerio-httpcli');
const twitter = require('twitter');
const { Client } = require('pg');

// HTML スクレイピング先
const urlSp = 'http://www.albirex.co.jp/sp/';
const urlPd = 'http://www.albirex.co.jp/news/photo_diary';

exports.scrape = async isDebug => {
    // 現時点の最新記事のタイトルとURL
    const recentTitles = await loadRecentTitle(isDebug);
    // サイトに問い合わせした結果
    const spResult = await scrapeSpSite();
    const pdResult = await scrapePhotoDiary();

    // 更新があったかどうか
    let haveUpdate = false;

    if (spResult.beat.title != null &&
        spResult.beat.title != recentTitles.beat.title) {
        saveRecentTitle(isDebug, 'beat', spResult.beat);
        tweetUpdate(isDebug, 'アルビの鼓動', spResult.beat);
        haveUpdate = true;
    }

    if (spResult.staff.title != null &&
        spResult.staff.title != recentTitles.staff.title) {
        saveRecentTitle(isDebug, 'staff', spResult.staff);
        tweetUpdate(isDebug, '広報ダイアリー', spResult.staff);
        haveUpdate = true;
    }

    if (spResult.news.title != null &&
        spResult.news.title != recentTitles.news.title) {
        saveRecentTitle(isDebug, 'news', spResult.news);
        tweetUpdate(isDebug, 'ニュース', spResult.news);
        haveUpdate = true;
    }

    if (spResult.academy.title != null &&
        spResult.academy.title != recentTitles.academy.title) {
        saveRecentTitle(isDebug, 'academy', spResult.academy);
        tweetUpdate(isDebug, 'アカデミー', spResult.academy);
        haveUpdate = true;
    }

    if (pdResult.photo.title != null &&
        pdResult.photo.title != recentTitles.photo.title) {
        saveRecentTitle(isDebug, 'photo', pdResult.photo);
        tweetUpdate(isDebug, 'フォトダイアリー', pdResult.photo);
        haveUpdate = true;
    }

    if (spResult.column.title != null &&
        spResult.column.title != recentTitles.column.title) {
        spResult.column.title = spResult.column.title.replace(/【コラム】/g, '');
        saveRecentTitle(isDebug, 'column', spResult.column);
        tweetUpdate(isDebug, 'コラム', spResult.column);
        haveUpdate = true;
    }

    if (!haveUpdate && isDebug) {
        console.log('Mbal:', Date() + '\n' + 'Mbal contents are up to date.');
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
                let column = new Object({ title: null, url: null });

                if (/albirex_beat/.test(recentMbalUrl)) {
                    beat = new Object({ title: recentMbalTitle, url: recentMbalUrl });
                } else if (/public_diary/.test(recentMbalUrl)) {
                    staff = new Object({ title: recentMbalTitle, url: recentMbalUrl });
                } else if (/walk_way/.test(recentMbalUrl)) {
                    column = new Object({ title: recentMbalTitle, url: recentMbalUrl });
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
                    beat: beat, staff: staff, news: news,
                    academy: academy, column: column
                }));
            } else {
                console.error('Mbal:', Date() + '\n' +
                    'An error occurred while scraping SP site:', err);
                reject(err);
            }
        });
    })
        .catch(err => {
            console.error('Mbal:', Date() + '\n' + 'An error occurred:', err);
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
                const photo = new Object({
                    photo: {
                        title: $('.second-news-area').eq(0).find('a').eq(0).text(),
                        url: $('.second-news-area').eq(0).find('a').url()[1]
                    }
                });

                resolve(photo);
            } else {
                console.error('Mbal:', Date() + '\n' +
                    'An error occurred while scraping PC site:', err);
                reject(err);
            }
        });
    })
        .catch(err => {
            console.error('Mbal:', Date() + '\n' + 'An error occurred:', err);
            return err;
        });
}

/**
 * ツイートする
 * @param {boolean} isDebug デバッグ用
 * @param {string} header カテゴリ
 * @param {{title: string, url: string}} data ツイートの中身
 */
function tweetUpdate(isDebug, header, data) {
    const content = '【' + header + '】' + data.title + '\n' + data.url + '\n#albirex';
    console.log('Mbal:', Date() + '\n' + content);
    defineBot(isDebug).post(
        'statuses/update',
        { status: content },
        err => {
            if (!err) {
                console.log('Tweet succeeded.');
            } else {
                console.error('An error occurred while tweeting:', err);
            }
        }
    );
}

/**
 * つぶやくアカウントを設定する
 * @param {boolean} isDebug デバッグ用
 * @return {{twitter}} Twitter の CK/CS
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
            consumer_key: process.env.MBAL_CK,
            consumer_secret: process.env.MBAL_CS,
            access_token_key: process.env.MBAL_ATK,
            access_token_secret: process.env.MBAL_ATS
        });
    }
}

/**
 * SQL テーブルから記事タイトルの一覧を取得
 * @param {boolean} isDebug デバッグ用
 * @return {Promise<{category: {title: string, url: string}}>} タイトルとURLのリスト
 */
async function loadRecentTitle(isDebug) {
    try {
        const client = defineSql(isDebug);

        client.connect(err => {
            if (err) {
                console.error('Mbal:', Date() + '\n' +
                    'An error occurred while fetching SQL:', err);
                throw err;
            }
        });

        const result = await client.query('SELECT category, title, url FROM public.mbal');
        let beat, staff, news, academy, photo, column;
        result.rows.filter((item) => {
            if (item.category == 'beat') {
                beat = item;
            }
            if (item.category == 'staff') {
                staff = item;
            }
            if (item.category == 'news') {
                news = item;
            }
            if (item.category == 'academy') {
                academy = item;
            }
            if (item.category == 'photo') {
                photo = item;
            }
            if (item.category == 'column') {
                column = item;
            }
        });

        client.end();

        return new Object({
            beat: beat, staff: staff, news: news,
            academy: academy, photo: photo, column: column
        });
    } catch (err) {
        console.error(err);
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
        const client = defineSql(isDebug);

        client.connect(err => {
            if (err) {
                console.log('Mbal:', Date() + '\n' +
                    'An error occurred while fetching SQL:', err);
                throw err;
            }
        });
        
        await client.query('UPDATE public.mbal SET title = \'' + data.title +
            '\', url = \'' + data.url + '\' WHERE category = \'' + category + '\'');

        client.end();
    } catch (err) {
        console.error(err);
    }
}

/**
 * 読み込む SQL テーブル先を設定する
 * @param {boolean} isDebug デバッグ用
 * @return {{Client}} SQLの接続設定
 */
function defineSql(isDebug) {
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
}