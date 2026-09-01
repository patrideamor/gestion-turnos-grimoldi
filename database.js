const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.json');

const defaultData = {
  config: {
    adminPin: "2782",
    schedules": {
      "1": ["08:00", "09:00", "18:00", "19:00", "20:00"],
      "2": ["15:00", "16:00", "17:00", "18:00"],
      "3": ["08:00", "09:00", "10:00", "18:00", "19:00"],
      "4": ["14:00", "15:00", "16:00", "17:00", "18:00"],
      "5": ["14:00", "15:00", "16:00", "17:00"],
      "6": [],
      "0": []
    }
  },
  patients: {},
  appointments: []
};

function readDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2), 'utf8');
      return defaultData;
    }
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return defaultData;
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    return false;
  }
}

module.exports = { readDB, writeDB };