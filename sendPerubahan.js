import axios from "axios";
import https from "https";
import fs from "fs";
import cheerio from "cheerio";
import mqtt from "mqtt";
import cron from "node-cron";
import puppeteer from "puppeteer";

async function SendWa(to, subject, text) {
  var topic = "wa-send-up3";
  var mqclient = mqtt.connect("tcp://mqtt.cybtr.com", {
    username: "up3",
    password: "up3d1e21edQ",
  });
  mqclient.publish(
    topic,
    to + " << " + subject + "\n" + text,
    { qos: 2 },
    function (err) {
      console.log("WA sent");
      mqclient.end();
    }
  );
}

async function sendWaV2(to, message, media) {
  var topic = "wa-send-up3-v2";
  var mqclient = mqtt.connect("tcp://mqtt.cybtr.com", {
    username: "up3",
    password: "up3d1e21edQ",
  });

  let recipient = to;

  // Tambahkan "@c.us" jika nomor diawali dengan "62" dan panjangnya 12 digit
  if (recipient.startsWith("62") && recipient.length === 12) {
    recipient += "@c.us";
  }
  // Tambahkan "@g.us" jika panjang nomor lebih dari 12 digit
  else if (recipient.length > 12) {
    recipient += "@g.us";
  }

  let payload = { phone_number: recipient, message: message };
  const mimeType = "image/png";

  payload.media = { mimetype: mimeType, data: media };

  mqclient.publish(topic, JSON.stringify(payload), { qos: 2 }, function (err) {
    console.log("WA media sent");
    mqclient.end();
  });
}

const getHtml = async (url) => {
  try {
    const agent = new https.Agent({
      rejectUnauthorized: false,
    });

    const response = await axios.get(url, {
      httpsAgent: agent,
    });

    return response.data;
  } catch (error) {
    console.rror(error);
  }
};

const getPTNBH = async (html) => {
  const $ = cheerio.load(html);
  let links = [];
  const PTNBH_tambahan = [
    "https://pindai.kemdikbud.go.id/web/detailiku/2022/99A3B7AF-6470-4D18-8B06-09941E663B07",
    "https://pindai.kemdikbud.go.id/web/detailiku/2022/1784B927-347A-425D-8DCF-7CE8FD4E0002",
    "https://pindai.kemdikbud.go.id/web/detailiku/2022/1804CC66-CB19-4E93-8B3F-1AF71AD469FF",
    "https://pindai.kemdikbud.go.id/web/detailiku/2022/7AC51265-ECC2-44D7-8FB2-717D3CF1ABC5",
  ];
  let foundAkademikPTNBH = false;

  $("tr").each((index, element) => {
    const header = $(element).find("th").text();
    if (header.includes("Akademik - PTNBH")) {
      foundAkademikPTNBH = true;
    } else if (foundAkademikPTNBH) {
      const link = $(element).find("a[href]").attr("href");
      if (link) {
        links.push(link);
      } else {
        foundAkademikPTNBH = false;
      }
    }
  });

  links = links.concat(PTNBH_tambahan);
  links = links.map((link) => link.replace("2021", "2022"));

  // console.log(links);
  return links;
};

const parsingTable = async (links, html) => {
  // console.log(html);
  const $ = cheerio.load(html);
  const tableData = $("tr")
    .map((_, tr) => {
      const row = $(tr).find("th, td");
      const rowObject = {};

      row.each((index, cell) => {
        const key = index === 0 ? "keterangan" : `IKU${index}`;
        rowObject[key] = $(cell).text();
      });

      return rowObject;
    })
    .get();

  // console.log(tableData);
  let nama_ptn = $(
    "body > section > div > div > div > div > div:nth-child(2) > div > div.box-header.with-border > h3"
  ).text();
  nama_ptn = nama_ptn.replace("Indikator Kinerja Utama PT :", "");
  nama_ptn = nama_ptn.replace(" (2022)", "").trim();
  //replace spasi dengan underscore
  nama_ptn = nama_ptn.replace(/ /g, "_");

  const data = {
    nama_ptn,
    tableData,
  };
  // disimpan sesuai nama_ptn
  if (!fs.existsSync("dataIKU")) {
    fs.mkdirSync("dataIKU");
  }
  return data;
};

const compareData = async (tableData, nama_ptn) => {
  const filePath = "dataIKU/" + nama_ptn + ".json";

  // Check if the file exists, if not, create and save the data
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({ tableData }, null, 2));
  }

  const savedData = JSON.parse(fs.readFileSync(filePath));

  let changes = new Map();
  let changeMessage = "";

  tableData.forEach((newRow, rowIndex) => {
    if (rowIndex === 0) return; // Skip header

    const oldRow = savedData.tableData[rowIndex];

    for (const key in newRow) {
      if (newRow[key] !== oldRow[key]) {
        const keterangan = newRow.keterangan;
        const changeText = `IKU: ${key}\nData sebelumnya: ${oldRow[key]}\nData baru: ${newRow[key]}\n\n`;

        if (changes.has(keterangan)) {
          changes.set(keterangan, changes.get(keterangan) + changeText);
        } else {
          changes.set(keterangan, changeText);
        }
      }
    }
  });

  changes.forEach((value, key) => {
    //    changeMessage += `Keterangan: ${key}\n${value}\n`;
    changeMessage += `${key}\n${value}\n`;
  });

  if (changeMessage) {
    return [`*${nama_ptn}*\n\nPerubahan:\n\n${changeMessage}\n---\n`];
  }

  return [];
};

const formatDataText = (data) => {
  let text = `*${data.nama_ptn}*\n\n`;

  data.tableData.forEach((row, index) => {
    if (index === 0) return; // Skip header

    const keterangan = row.keterangan;
    //    text += `Keterangan: ${keterangan}\n`;
    text += `${keterangan}\n`;

    Object.keys(row).forEach((key) => {
      if (key !== "keterangan") {
        text += `${key}: ${row[key]}\n`;
      }
    });

    text += "\n";
  });

  return text;
};

const main = async () => {
  try {
    let allChanges = [];
    const html = await getHtml("https://pindai.kemdikbud.go.id/web/iku2021");
    const links = await getPTNBH(html);
    for (const link of links) {
      const html_detail = await getHtml(link);
      let data = await parsingTable(link, html_detail);

      const text = formatDataText(data);

      // matikan spy tidak terlalu byk WA
      const to = "120363102048157763";
      const subject = "Data IKU";
      //      SendWa(to, subject, text);
      const changes = await compareData(data.tableData, data.nama_ptn);
      allChanges = allChanges.concat(changes);
      // simpan data
      fs.writeFileSync(
        "dataIKU/" + data.nama_ptn + ".json",
        JSON.stringify(data)
      );
    }

    // Gabungkan semua pesan perubahan
    const changesText = allChanges.join("\n");

    // Kirim pesan melalui WhatsApp
    const to = "6281360031356-1619757526";
    const subject = "";
    if (changesText) {
//      SendWa(to, subject, changesText);
    } else {
//      SendWa(to, subject, "Tidak ada perubahan");
    }
    // Backup data
    await backupData();
  } catch (error) {
    console.error("Error in main function:", error);
  }
};

const backupData = async () => {
  // Membuat folder backup dengan format tanggal hari ini (misal: 2023-04-15)
  const today = new Date().toISOString().slice(0, 10);
  const backupFolder = `IKU_BACKUP/${today}`;
  if (!fs.existsSync(backupFolder)) {
    fs.mkdirSync(backupFolder, { recursive: true });
  }

  // Backup dataIKU ke folder backup
  fs.readdirSync("dataIKU").forEach((file) => {
    fs.copyFileSync(`dataIKU/${file}`, `${backupFolder}/${file}`);
  });
};

const getImage = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--disable-gpu",
      "--no-first-run",
    ],
  });
  const page = await browser.newPage();

  await page.setViewport({
    width: 1220,
    height: 1080,
  });

  await page.goto("http://10.15.43.68/");
  const element = await page.$("#table_wrapper");
  let base64 = await element.screenshot({ encoding: "base64" });
  console.log(base64);
  await browser.close();

  await sendWaV2("6281360031356-1619757526", "Stats Harian IKU", base64);
};

await main();
