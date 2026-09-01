const express = require('express');
const router = express.Router();
const { readDB, writeDB } = require('../database');

function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.status(401).json({ success: false, message: "No autorizado" });
}

router.get('/config', (req, res) => {
  const db = readDB();
  res.json(db.config);
});

router.put('/config/schedules', requireAuth, (req, res) => {
  const { schedules } = req.body;
  if (!schedules) return res.status(400).json({ success: false });
  const db = readDB();
  db.config.schedules = schedules;
  writeDB(db);
  res.json({ success: true, schedules: db.config.schedules });
});

router.get('/appointments', (req, res) => {
  const db = readDB();
  let appointments = db.appointments || [];
  appointments.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
  res.json(appointments);
});

router.post('/appointments', (req, res) => {
  const { name, phone, age, date, time, notes } = req.body;
  if (!name || !phone || !date || !time) {
    return res.status(400).json({ success: false, message: "Campos requeridos faltantes" });
  }
  const db = readDB();
  const cleanPhone = phone.trim();

  if (!db.patients[cleanPhone]) {
    db.patients[cleanPhone] = { name, phone: cleanPhone, age: age || "", notes: notes || "" };
  } else {
    db.patients[cleanPhone].name = name;
    if (age) db.patients[cleanPhone].age = age;
  }

  const exists = db.appointments.some(app => app.date === date && app.time === time && app.status !== 'Cancelado');
  if (exists) {
    return res.status(400).json({ success: false, message: "El bloque horario ya está ocupado" });
  }

  const newApp = {
    id: Date.now().toString(),
    patientPhone: cleanPhone,
    patientName: name,
    date,
    time,
    status: "Pendiente",
    createdAt: new Date().toISOString()
  };

  db.appointments.push(newApp);
  writeDB(db);
  res.json({ success: true, appointment: newApp });
});

router.patch('/appointments/:id/status', requireAuth, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const db = readDB();
  const app = db.appointments.find(a => a.id === id);
  if (!app) return res.status(404).json({ success: false });
  app.status = status;
  writeDB(db);
  res.json({ success: true, appointment: app });
});

router.delete('/appointments/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.appointments = db.appointments.filter(a => a.id !== id);
  writeDB(db);
  res.json({ success: true });
});

router.get('/patients', requireAuth, (req, res) => {
  const db = readDB();
  res.json(db.patients || {});
});

router.get('/patients/:phone', requireAuth, (req, res) => {
  const { phone } = req.params;
  const db = readDB();
  const patient = db.patients[phone];
  if (!patient) return res.status(404).json({ success: false });

  const history = db.appointments
    .filter(a => a.patientPhone === phone)
    .sort((a, b) => new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`));

  res.json({ patient, history });
});

router.put('/patients/:phone', requireAuth, (req, res) => {
  const { phone } = req.params;
  const { name, age, notes } = req.body;
  const db = readDB();
  if (!db.patients[phone]) return res.status(404).json({ success: false });

  db.patients[phone].name = name;
  db.patients[phone].age = age;
  db.patients[phone].notes = notes;

  db.appointments.forEach(app => {
    if (app.patientPhone === phone) {
      app.patientName = name;
    }
  });

  writeDB(db);
  res.json({ success: true, patient: db.patients[phone] });
});

module.exports = router;