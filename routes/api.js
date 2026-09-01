const express = require('express');
const router = express.Router();
const { readDB, writeDB } = require('../database');

function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.status(401).json({ success: false, message: "No autorizado" });
}

// Configuración y Horarios
router.get('/config', (req, res) => {
  const db = readDB();
  res.json(db.config);
});

router.put('/config/schedules', requireAuth, (req, res) => {
  const { schedules } = req.body;
  if (!schedules) {
    return res.status(400).json({ success: false, message: "Datos faltantes" });
  }
  const db = readDB();
  db.config.schedules = schedules;
  writeDB(db);
  res.json({ success: true, schedules: db.config.schedules });
});

// Obtención de Turnos y Ordenamiento Cronológico Ascendente
router.get('/appointments', (req, res) => {
  const db = readDB();
  let appointments = db.appointments || [];
  
  appointments.sort((a, b) => {
    const dateTimeA = new Date(`${a.date}T${a.time}`);
    const dateTimeB = new Date(`${b.date}T${b.time}`);
    return dateTimeA - dateTimeB;
  });
  
  res.json(appointments);
});

// Generación de evento iCal (.ics) para sincronización con Google Calendar
router.get('/appointments/:id/ics', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const app = db.appointments.find(a => a.id === id);

  if (!app) {
    return res.status(404).send("Turno no encontrado");
  }

  const [year, month, day] = app.date.split('-');
  const [hours, minutes] = app.time.split(':');
  
  const startYear = year;
  const startMonth = month;
  const startDay = day;
  const startHours = hours;
  const startMinutes = minutes;
  
  const endHours = String(parseInt(hours, 10) + 1).padStart(2, '0');

  const dtStart = `${startYear}${startMonth}${startDay}T${startHours}${startMinutes}00`;
  const dtEnd = `${startYear}${startMonth}${startDay}T${endHours}${startMinutes}00`;

  const icsContent = 
`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Lic Gabriela Grimoldi//Gestion de Turnos//ES
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${app.id}@gabrielagrimoldi.com
DTSTAMP:${dtStart}Z
DTSTART:${dtStart}
DTEND:${dtEnd}
SUMMARY:Turno con Lic. Gabriela Grimoldi
DESCRIPTION:Turno asignado para ${app.patientName}.
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="turno-${app.date}-${app.time}.ics"`);
  res.send(icsContent.replace(/\n/g, '\r\n'));
});

// Reserva pública o manual de turnos
router.post('/appointments', (req, res) => {
  const { name, phone, age, date, time, notes } = req.body;
  if (!name || !phone || !date || !time) {
    return res.status(400).json({ success: false, message: "Campos requeridos faltantes" });
  }

  const db = readDB();
  const cleanPhone = phone.trim();

  // Registrar o actualizar paciente
  if (!db.patients[cleanPhone]) {
    db.patients[cleanPhone] = { name, phone: cleanPhone, age: age || "", notes: notes || "" };
  } else {
    db.patients[cleanPhone].name = name;
    if (age) db.patients[cleanPhone].age = age;
  }

  // Verificar conflicto de turno
  const exists = db.appointments.some(app => app.date === date && app.time === time && app.status !== 'Cancelado');
  if (exists) {
    return res.status(400).json({ success: false, message: "El bloque horario seleccionado ya está ocupado" });
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

// Cambiar Estado del Turno
router.patch('/appointments/:id/status', requireAuth, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const db = readDB();
  const app = db.appointments.find(a => a.id === id);
  if (!app) {
    return res.status(404).json({ success: false, message: "Turno no encontrado" });
  }

  app.status = status;
  writeDB(db);
  res.json({ success: true, appointment: app });
});

// Eliminar Turno
router.delete('/appointments/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const db = readDB();
  
  db.appointments = db.appointments.filter(a => a.id !== id);
  writeDB(db);
  res.json({ success: true, message: "Turno eliminado con éxito" });
});

// Directorio Centralizado de Pacientes
router.get('/patients', requireAuth, (req, res) => {
  const db = readDB();
  res.json(db.patients || {});
});

// Ficha de Paciente e Historial Relacional
router.get('/patients/:phone', requireAuth, (req, res) => {
  const { phone } = req.params;
  const db = readDB();
  const patient = db.patients[phone];

  if (!patient) {
    return res.status(404).json({ success: false, message: "Paciente no encontrado" });
  }

  const history = db.appointments
    .filter(a => a.patientPhone === phone)
    .sort((a, b) => new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`));

  res.json({ patient, history });
});

// Actualización Relacional de Paciente
router.put('/patients/:phone', requireAuth, (req, res) => {
  const { phone } = req.params;
  const { name, age, notes } = req.body;
  
  const db = readDB();
  if (!db.patients[phone]) {
    return res.status(404).json({ success: false, message: "Paciente no encontrado" });
  }

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