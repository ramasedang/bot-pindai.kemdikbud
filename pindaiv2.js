import axios from "axios";
import https from "https";
import fs from "fs";
import cheerio from "cheerio";
import mqtt from "mqtt";

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
    changeMessage += `Keterangan: ${key}\n${value}\n`;
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
    text += `Keterangan: ${keterangan}\n`;

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
  let allChanges = [];
  const html = await getHtml("https://pindai.kemdikbud.go.id/web/iku2021");
  const links = await getPTNBH(html);
  for (let i = 0; i < links.length; i++) {
    const html_detail = await getHtml(links[i]);
    let data = await parsingTable(links[i], html_detail);

    const text = formatDataText(data);

    // Kirim pesan melalui WhatsApp
    const to = "089523804019";
    const subject = "Data IKU";
    SendWa(to, subject, text);
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
  const to = "089523804019";
  const subject = "Perubahan Data IKU";
  // console.log(changesText);
  if (changesText) {
    SendWa(to, subject, changesText);
  }
};

main();
