/*
  Скрипт для Google Таблицы: принимает заявки с лендинга и добавляет их в лист «Заявки».

  Как установить:
  1. Откройте таблицу → Расширения → Apps Script.
  2. Удалите содержимое файла Code.gs, вставьте этот код, сохраните.
  3. Развернуть → Новое развёртывание → Веб-приложение.
     - Тип доступа: «Все» (Anyone)
     - Выполнять как: «Я» (Me)
  4. Скопируйте адрес вида https://script.google.com/macros/s/AKfycb.../exec
     и замените им LEAD_ENDPOINT в файле script.js лендинга.
*/

const SHEET_ID = '1Nj8GuJzeDfqNMu0rTpebgVF0tLohYgfkIwt_T3hrSUo';
const SHEET_NAME = 'Заявки';
const PHONE_COLUMN = 3; // Столбец C — телефон.

// Таблицы воспринимают значение, начинающееся с "+", "-", "=" или "@", как
// формулу и показывают #ERROR! Синтаксическая ошибка. Приводим телефон к виду
// "7 (999) ..." — он начинается с цифры и никогда не становится формулой.
function asPlainText(value) {
  return String(value == null ? '' : value)
    .trim()
    .replace(/^(?:\+7|8)/, '7')
    .replace(/^[+=\-@]+/, '')
    .trim();
}

const HEADERS = [
  'Дата и время',
  'Имя',
  'Телефон',
  'Площадь',
  'Бюджет',
  'Участок',
  'Заезд',
  'Тип формы',
  'Страница',
  'UTM-метки'
];

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);

    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(SHEET_NAME);
      sheet.appendRow(HEADERS);
      sheet.setFrozenRows(1);
      sheet.setColumnWidth(1, 170);
      sheet.setColumnWidth(2, 160);
      sheet.setColumnWidth(3, 160);
      sheet.setColumnWidth(4, 130);
      sheet.setColumnWidth(5, 130);
      sheet.setColumnWidth(6, 140);
      sheet.setColumnWidth(7, 140);
      sheet.setColumnWidth(8, 150);
    }

    const row = [
      payload.date || new Date().toISOString(),
      payload.name || '',
      payload.phone || '',
      payload.area || '',
      payload.budget || '',
      payload.plot || '',
      payload.moveIn || '',
      payload.source || '',
      payload.page || '',
      payload.utm || ''
    ];

    const nextRow = sheet.getLastRow() + 1;

    // Формат «@» = текст. Задаём для всей колонки телефона и конкретной ячейки
    // до записи значения, чтобы номер хранился как текст, а не как число.
    sheet.getRange(1, PHONE_COLUMN, Math.max(sheet.getMaxRows(), nextRow), 1)
      .setNumberFormat('@');
    const phoneCell = sheet.getRange(nextRow, PHONE_COLUMN, 1, 1);
    phoneCell.setNumberFormat('@');

    row[PHONE_COLUMN - 1] = asPlainText(row[PHONE_COLUMN - 1]);

    sheet.getRange(nextRow, 1, 1, row.length).setValues([row]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(error) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Проверка, что веб-приложение доступно: откройте URL в браузере.
function doGet(e) {
  return ContentService
    .createTextOutput('Лендинг «Уральский каркас»: приём заявок активен.')
    .setMimeType(ContentService.MimeType.TEXT);
}
