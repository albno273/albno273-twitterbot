/* モバアル更新チェック */

const client = require('cheerio-httpcli');
const twitter = require('twitter');
const fs = require('fs');

// HTML スクレイピング先
const urlSp = 'http://www.albirex.co.jp/sp/';
const urlPd = 'http://www.albirex.co.jp/news/photo_diary';

exports.scrape = async isDebug => {
    // UA変更
    client.set('browser', 'iphone');

    // 最新記事のタイトル
    const text = await fs.readFileSync(process.env.MBAL_LOG, { encoding: 'utf8' });
    const titleArr = text.replace(/\r/g, '').split('\n');
    const beatRecent = titleArr[0];
    const staffRecent = titleArr[1];
    const newsRecent = titleArr[2];
    const academyRecent = titleArr[3];
    const photoRecent = titleArr[4];
    const columnRecent = titleArr[5];

    // 更新があったかどうか
    let haveUpdate = false;

    const spResult = await fetchAndScrapeSp();
    const pdResult = await fetchAndScrapePd();

    if(spResult.beat.title != null && spResult.beat.title != beatRecent) {
        tweetUpdate('アルビの鼓動', spResult.beat, isDebug);
        haveUpdate = true;
    }

    if (spResult.staff.title != null && spResult.staff.title != staffRecent) {
        tweetUpdate('広報ダイアリー', spResult.staff, isDebug);
        haveUpdate = true;
    }

    if (spResult.news.title != null && spResult.news.title != newsRecent) {
        tweetUpdate('ニュース', spResult.news, isDebug);
        haveUpdate = true;
    }

    if (spResult.academy.title != null && spResult.academy.title != academyRecent) {
        tweetUpdate('アカデミー', spResult.academy, isDebug);
        haveUpdate = true;
    }

    if (pdResult.photo.title != null && pdResult.photo.title != photoRecent) {
        tweetUpdate('フォトダイアリー', pdResult.photo, isDebug);
        haveUpdate = true;
    }

    if (spResult.column.title != null && spResult.column.title != columnRecent) {
        spResult.column.title = spResult.column.title.replace(/【コラム】/g, '');
        tweetUpdate('コラム', spResult.column, isDebug);
        haveUpdate = true;
    }

    if (haveUpdate) {
        const beat = spResult.beat.title == null ? beatRecent : spResult.beat.title;
        const staff = spResult.staff.title == null ? staffRecent : spResult.staff.title;
        const column = spResult.column.title == null ? columnRecent : spResult.column.title;

        const text = beat + '\n' + staff + '\n'
            + spResult.news.title + '\n' + spResult.academy.title + '\n'
            + pdResult.photo.title + '\n' + column;
        fs.writeFileSync(process.env.MBAL_LOG, text, err => {
            if (err) {
                console.log('Mbal:', Date() + '\n' +
                    'An error occurred while updating log file:', err);
            }
        });
    } else {
        if(isDebug) {
            console.log('mbal:', Date() + '\n' + 'Mbal contents are up to date.');
        }
    }
};

function fetchAndScrapeSp() {
    return new Promise((resolve, reject) => {
        client.fetch(urlSp, (err, $) => {
            if (!err) {
                // TODO: 文字列の切り出し方
                const mbalTitle = $('.whats-new-detail > .text').find('a').html()
                    .split('<br>')[1].replace('を更新しました', '').trim();
                const mbalUrl = $('.whats-new-detail').find('a').url();

                let beat = new Object({ title: null, url: null });
                let staff = new Object({ title: null, url: null });
                let column = new Object({ title: null, url: null });

                if(/albirex_beat/.test(mbalUrl)) {
                    beat = new Object({ title: mbalTitle, url: mbalUrl });
                } else if (/public_diary/.test(mbalUrl)) {
                    staff = new Object({ title: mbalTitle, url: mbalUrl });
                } else if (/walk_way/.test(mbalUrl)) {
                    column = new Object({ title: mbalTitle, url: mbalUrl });
                }

                const newsRes = $('.news > .category-detail > ul > li').eq(0);
                const academyRes = $('.academy-news > .category-detail > ul > li').eq(0);
                const news = new Object({ title: newsRes.find('span').text(), url: newsRes.find('a').url() });
                const academy = new Object({ title: academyRes.find('span').text(), url: academyRes.find('a').url() });

                resolve(new Object({
                    beat: beat, staff: staff, news: news, 
                    academy: academy, column: column
                }));
            } else {
                console.log('Mbal:', Date() + '\n' + 
                    'An error occurred while scraping SP site:', err);
                reject(err);
            }
        });
    })
        .catch(err => {
            console.log('Mbal:', Date() + '\n' +
                'An error occurred:', err);
            return err;
        });
}

function fetchAndScrapePd() {
    return new Promise((resolve, reject) => {
        client.fetch(urlPd, (err, $) => {
            if (!err) {
                const photo = new Object({photo: {
                    title: $('.second-news-area').eq(0).find('a').eq(0).text(),
                    url: $('.second-news-area').eq(0).find('a').url()[1]
                }});
                resolve(photo);
            } else {
                console.log('Mbal:', Date() + '\n' +
                    'An error occurred while scraping PC site:', err);
                reject(err);
            }
        });
    })
        .catch(err => {
            console.log('Mbal:', Date() + '\n' +
                'An error occurred:', err);
            return err;
        });
}

/**
 * ツイートする
 * @param {string} header カテゴリ
 * @param {{title: string, url: string}} data ツイートの中身
 */
function tweetUpdate(header, data, isDebug) {
    const content = '【' + header + '】' + data.title + '\n' + data.url + '\n#albirex';
    console.log('Mbal:', Date() + '\n' + content);
    defineBot(isDebug).post(
        'statuses/update',
        { status: content },
        err => {
            if (!err) {
                console.log('Tweet succeeded.');
            } else {
                console.log('An error occurred while tweeting:', err);
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
            consumer_key: process.env.MBAL_CK,
            consumer_secret: process.env.MBAL_CS,
            access_token_key: process.env.MBAL_ATK,
            access_token_secret: process.env.MBAL_ATS
        });
    }
}