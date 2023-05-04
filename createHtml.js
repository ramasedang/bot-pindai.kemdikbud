import fs from "fs";

const generateHtmlTable = () => {
  const universities = [
    "Institut_Pertanian_Bogor",
    "Institut_Teknologi_Bandung",
    "Institut_Teknologi_Sepuluh_Nopember",
    "Universitas_Airlangga",
    "Universitas_Andalas",
    "Universitas_Brawijaya",
    "Universitas_Diponegoro",
    "Universitas_Gadjah_Mada",
    "Universitas_Hasanuddin",
    "Universitas_Indonesia",
    "Universitas_Negeri_Malang",
    "Universitas_Negeri_Padang",
    "Universitas_Padjadjaran",
    "Universitas_Pendidikan_Indonesia",
    "Universitas_Sebelas_Maret",
    "Universitas_Sumatera_Utara",
  ];

  let gold = [80, 30, 20, 40, 15, 50, 35, 5];

  var currentdate = new Date(); 
  var datetime = currentdate.getDate() + "/"
                + (currentdate.getMonth()+1)  + "/" 
                + currentdate.getFullYear() + " "  
                + currentdate.getHours() + ":"  
                + currentdate.getMinutes() + ":" 
                + currentdate.getSeconds();

  const tableHeader = `

<head>
   <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/1.13.4/css/jquery.dataTables.min.css">
   <script type="text/javascript" language="javascript" src="https://code.jquery.com/jquery-3.5.1.js"></script>
   <script type="text/javascript" language="javascript" src="https://cdn.datatables.net/1.13.4/js/jquery.dataTables.min.js"></script>

    <title>Data IKU</title>
    <style>
        table {
            border-collapse: collapse;
            width: 100%;
        }

        th,
        td {
            text-align: right;
            padding: 0px;
            border: 1px solid #ddd;
        }

        td:first-child {
            text-align: left;
        }

	table.dataTable tbody th, table.dataTable tbody td {
	    padding: 6px 10px; 
}
/*        th:first-child {
            background-color: #f2f2f2;
            color: #444;
            font-weight: bold;
        }

        tr:nth-child(even) {
            background-color: #f2f2f2;
        }
*/
        .red {
            background-color: #ffc4c4;
        }
    </style>
</head>
<table id="table" class="display">
    <caption>DELTA TERHADAP GOLD STANDARD UNIVERSITAS - ${datetime}</caption>
    <thead>
        <tr>
            <th>Nama Universitas</th>
            <th>IKU1</th>
            <th>IKU2</th>
            <th>IKU3</th>
            <th>IKU4</th>
            <th>IKU5</th>
            <th>IKU6</th>
            <th>IKU7</th>
            <th>IKU8</th>
            <th>PENCAPAIAN</th>
            <th>PERTUMBUHAN</th>
        </tr>
    </thead>
    <tbody>
        `;

  const tableFooter = `
    </tbody>
</table>
<script>
    const tdList = document.querySelectorAll("td");

    tdList.forEach((td) => {
        if (td.textContent.includes("-")) {
            td.classList.add("red");
        }
    });

    const table = document.getElementById("table");
    const maxValues = [];

    // Loop through each column and find the maximum value
    for (let i = 1; i < table.rows[0].cells.length; i++) {
        let maxValue = Number.NEGATIVE_INFINITY;
        for (let j = 0; j < table.rows.length; j++) {
            const cellValue = parseFloat(table.rows[j].cells[i].textContent);
            if (cellValue > maxValue) {
                maxValue = cellValue;
            }
        }
        maxValues.push(maxValue);
    }

    // Loop through each column and highlight cells with the maximum value in green
    for (let i = 1; i < table.rows[0].cells.length; i++) {
        for (let j = 0; j < table.rows.length; j++) {
            const cellValue = parseFloat(table.rows[j].cells[i].textContent);
            if (cellValue === maxValues[i - 1]) {
                table.rows[j].cells[i].style.backgroundColor = "green";
                table.rows[j].cells[i].style.color = "white";
                table.rows[j].cells[i].style.fontWeight = "bold";
            }
        }
    }

   document.addEventListener('DOMContentLoaded', function () {
    let table = new DataTable('#table', {
      searching: false,
      paging: false,
      info: false,
      order: [[9, 'desc']],
    });
   });

</script>
`;

  let tableBody = "";

  universities.forEach((univ) => {
    try {
      const data = JSON.parse(
        fs.readFileSync(`/home/ubuntu/UP3/bot-pindai.kemdikbud/dataIKU/${univ}.json`, {
          encoding: "utf-8",
        })
      );

      const namaPtn = data.nama_ptn.replace(/_/g, " ");
      const pertumbuhan = data.tableData[3];
      const ikuData = data.tableData[4];

      let skorPertumbuhan = 0;
      skorPertumbuhan += (parseFloat(pertumbuhan.IKU1) < 0 ? 0 : (parseFloat(pertumbuhan.IKU1)));
      skorPertumbuhan += (parseFloat(pertumbuhan.IKU2) < 0 ? 0 : (parseFloat(pertumbuhan.IKU2)));
      skorPertumbuhan += (parseFloat(pertumbuhan.IKU3) < 0 ? 0 : (parseFloat(pertumbuhan.IKU3)));
      skorPertumbuhan += (parseFloat(pertumbuhan.IKU4) < 0 ? 0 : (parseFloat(pertumbuhan.IKU4)));
      skorPertumbuhan += (parseFloat(pertumbuhan.IKU5) < 0 ? 0 : (parseFloat(pertumbuhan.IKU5)));
      skorPertumbuhan += (parseFloat(pertumbuhan.IKU6) < 0 ? 0 : (parseFloat(pertumbuhan.IKU6)));
      skorPertumbuhan += (parseFloat(pertumbuhan.IKU7) < 0 ? 0 : (parseFloat(pertumbuhan.IKU7)));
      skorPertumbuhan += (parseFloat(pertumbuhan.IKU8) < 0 ? 0 : (parseFloat(pertumbuhan.IKU8)));
      skorPertumbuhan = skorPertumbuhan.toFixed(2);
//console.log(data.tableData[4]);

      let skor = 0;
      skor += (parseFloat(ikuData.IKU1) > 0 ? 10 : (gold[0] + parseFloat(ikuData.IKU1)) / gold[0]*10);
      skor += (parseFloat(ikuData.IKU2) > 0 ? 10 : (gold[1] + parseFloat(ikuData.IKU2)) / gold[1]*10);
      skor += (parseFloat(ikuData.IKU3) > 0 ? 10 : (gold[2] + parseFloat(ikuData.IKU3)) / gold[2]*10);
      skor += (parseFloat(ikuData.IKU4) > 0 ? 10 : (gold[3] + parseFloat(ikuData.IKU4)) / gold[3]*10);
      skor += (parseFloat(ikuData.IKU5) > 0 ? 10 : (gold[4] + parseFloat(ikuData.IKU5)) / gold[4]*10);
      skor += (parseFloat(ikuData.IKU6) > 0 ? 10 : (gold[5] + parseFloat(ikuData.IKU6)) / gold[5]*10);
      skor += (parseFloat(ikuData.IKU7) > 0 ? 10 : (gold[6] + parseFloat(ikuData.IKU7)) / gold[6]*10);
      skor += (parseFloat(ikuData.IKU8) > 0 ? 10 : (gold[7] + parseFloat(ikuData.IKU8)) / gold[7]*10);
      skor = skor.toFixed(2);

      let row = `
<tr>
    <td>${namaPtn}</td>
    <td class="${ikuData.IKU1 < 0 ? " red" : ""}">${ikuData.IKU1}</td>
    <td class="${ikuData.IKU2 < 0 ? " red" : ""}">${ikuData.IKU2}</td>
    <td class="${ikuData.IKU3 < 0 ? " red" : ""}">${ikuData.IKU3}</td>
    <td class="${ikuData.IKU4 < 0 ? " red" : ""}">${ikuData.IKU4}</td>
    <td class="${ikuData.IKU5 < 0 ? " red" : ""}">${ikuData.IKU5}</td>
    <td class="${ikuData.IKU6 < 0 ? " red" : ""}">${ikuData.IKU6}</td>
    <td class="${ikuData.IKU7 < 0 ? " red" : ""}">${ikuData.IKU7}</td>
    <td class="${ikuData.IKU8 < 0 ? " red" : ""}">${ikuData.IKU8}</td>
    <td class="">${skor}</td>
    <td class="">${skorPertumbuhan}</td>
</tr>
`;
      tableBody += row;
    } catch (error) {
      console.log(error);
    }
  });

  const html = tableHeader + tableBody + tableFooter;

  // save to /usr/share/nginx/html/index.html
  fs.writeFileSync("/var/www/html/index.html", html, {
    encoding: "utf-8",
  });

  console.log("HTML table generated");

  return html;
};

generateHtmlTable();

export default generateHtmlTable;
