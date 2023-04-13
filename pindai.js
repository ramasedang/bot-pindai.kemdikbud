import axios from 'axios';
import cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import fs from 'fs';
import mqtt from 'mqtt';

const browserConfig = {
  headless: true,
  args: ['--no-sandbox'],
  // executablePath: '/usr/bin/chromium-browser',
};

async function SendWa(to, subject, text) {
  var topic = 'wa-send-up3';
  var mqclient = mqtt.connect('tcp://mqtt.cybtr.com', {
    username: 'up3',
    password: 'up3d1e21edQ',
  });
  mqclient.publish(
    topic,
    to + ' << ' + subject + '\n' + text,
    { qos: 2 },
    function (err) {
      console.log('WA sent');
      mqclient.end();
    }
  );
}


const loginPindai = async () => {
  const browser = await puppeteer.launch(browserConfig);
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36'
  );
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.8',
  });
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
    window.navigator.chrome = {
      runtime: {},
    };
  });

  await page.goto('https://pindai.kemdikbud.go.id/login', {
    waitUntil: 'networkidle2',
  });
  await page.waitForSelector(
    'body > div > div.login-box-body > form > div:nth-child(1) > input'
  );
  await page.type(
    'body > div > div.login-box-body > form > div:nth-child(1) > input',
    '002002'
  );
  await page.type(
    'body > div > div.login-box-body > form > div:nth-child(2) > input',
    '70009'
  );
  await page.screenshot({ path: 'pindai.png' });
  const [element] = await page.$x(
    '/html/body/div/div[2]/form/div[3]/div/button'
  );

  // Click on the element
  await element.click();
  await page.waitForSelector(
    'body > div > div > section.content-header > h1'
  );
  await page.goto('https://pindai.kemdikbud.go.id/iku2022');
  await page.screenshot({ path: 'pindai.png' });
  const $ = cheerio.load(await page.content());
  const tableData = $('tr')
  .map((_, tr) => {
    const row = $(tr).find('th, td');
    const rowObject = {};

    row.each((index, cell) => {
      const key = index === 0 ? 'keterangan' : `IKU${index}`;
      rowObject[key] = $(cell).text();
    });

    return rowObject;
  })
  .get();

const savedData = JSON.parse(fs.readFileSync('data.json', 'utf8'));

let changes = [];

tableData.forEach((newRow, rowIndex) => {
  const oldRow = savedData[rowIndex];

  for (const key in newRow) {
    if (newRow[key] !== oldRow[key]) {
      const changeMessage = `Keterangan: ${newRow.keterangan}\nIKU: ${key}\nData sebelumnya: ${oldRow[key]}\nData baru: ${newRow[key]}\n---\n`;
      changes.push(changeMessage);
    }
  }
});

if (changes.length > 0) {
  const message = `Perubahan terdeteksi!\n\n${changes.join('\n')}`;
  SendWa('6289523804019', 'Perubahan IKU', message);
} else {
  console.log('Tidak ada perubahan data.');
}



  await fs.writeFile('data.json', JSON.stringify(tableData), (err) => {
    if (err) throw err;
    console.log('Data written to file');
  });

  await browser.close();
};

loginPindai();
