const express = require('express');
const app = express();
const ejs = require('ejs');
const commonFuncs = require('./scripts/commonFuncs.js');

app.set('port', (process.env.PORT || 8000));
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));
app.engine('html', ejs.renderFile);
app.set('view engine', 'html');

app.get('/', (request, response) => {
    response.render('top.ejs');
});

app.get('/mbal', async (request, response) => {
    const mbal = await loadMbal(false);
    response.render('mbal.ejs', mbal);
});

app.get('/grkb', async (request, response) => {
    const grkb = await loadGrkb(false);
    response.render('grkb.ejs', grkb);
});

app.listen(app.get('port'), () => {
    console.log('Node app is running at localhost:' + app.get('port'));
});

/**
 * SQL テーブルから記事タイトルの一覧を取得
 * @param {boolean} isDebug デバッグ用
 * @return {Promise<{category: {title: string, url: string}}>} タイトルとURLのリスト
 */
async function loadMbal(isDebug) {
    try {
        const client = commonFuncs.defineSql(isDebug);

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
 * SQL テーブルから記事タイトルの一覧を取得
 * @param {boolean} isDebug デバッグ用
 * @return {Promise<{category: {title: string, url: string}}>} タイトルとURLのリスト
 */
async function loadGrkb(isDebug) {
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