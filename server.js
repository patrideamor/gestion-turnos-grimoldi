const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Función auxiliar para leer base de datos
function readData() {
    if (!fs.existsSync(DATA_FILE)) {
        const initialData = { appointments: [], patients: [] };
        fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
        return initialData;
    }
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return { appointments: [], patients: [] };
    }
}

// Función auxiliar para escribir base de datos de forma atómica
function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// --- API DE TURNOS ---

// Obtener todos los turnos
app.get('/api/appointments', (req, res) => {
    const db = readData();
    res.json(db.appointments);
});

// Crear un turno y actualizar/crear ficha de paciente relacionalmente
app.post('/api/appointments', (req, res) => {
    const { date, time, patientName, patientPhone, patientAge } = req.body;
    if (!date || !time || !patientName || !patientPhone) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const db = readData();

    // Verificar si el turno ya está ocupado
    const ocupado = db.appointments.find(a => a.date === date && a.time === time && a.status !== 'Cancelado');
    if (ocupado) {
        return res.status(400).json({ error: 'El horario seleccionado ya se encuentra ocupado.' });
    }

    const newAppointment = {
        id: Date.now().toString(),
        date,
        time,
        patientName,
        patientPhone,
        patientAge: patientAge || '',
        status: 'Pendiente'
    };

    db.appointments.push(newAppointment);

    // Gestión relacional del paciente (Clave Primaria: Teléfono)
    let patient = db.patients.find(p => p.phone === patientPhone);
    if (patient) {
        patient.name = patientName; // Actualiza nombre si cambió
        if (patientAge) patient.age = patientAge;
        // Evitar duplicar historial exacto si ya existe
        const visitaExiste = patient.history.some(h => h.date === date && h.time === time);
        if (!visitaExiste) {
            patient.history.push({ date, time, appointmentId: newAppointment.id });
        }
    } else {
        db.patients.push({
            phone: patientPhone,
            name: patientName,
            age: patientAge || '',
            notes: '',
            history: [{ date, time, appointmentId: newAppointment.id }]
        });
    }

    writeData(db);
    res.status(201).json(newAppointment);
});

// Actualizar estado de turno (ej. Confirmar / Cancelar)
app.patch('/api/appointments/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const db = readData();

    const appt = db.appointments.find(a => a.id === id);
    if (!appt) return res.status(404).json({ error: 'Turno no encontrado' });

    if (status) appt.status = status;
    writeData(db);
    res.json(appt);
});

// Eliminar turno
app.delete('/api/appointments/:id', (req, res) => {
    const { id } = req.params;
    const db = readData();
    const index = db.appointments.findIndex(a => a.id === id);
    if (index === -1) return res.status(404).json({ error: 'Turno no encontrado' });

    db.appointments.splice(index, 1);
    writeData(db);
    res.json({ success: true });
});


// --- API DE PACIENTES / FICHAS ---

// Obtener todas las fichas de pacientes
app.get('/api/patients', (req, res) => {
    const db = readData();
    res.json(db.patients);
});

// Actualizar ficha de paciente y sincronizar relacionalmente sus turnos
app.put('/api/patients/:phone', (req, res) => {
    const { phone } = req.params;
    const { name, age, notes } = req.body;
    const db = readData();

    const patient = db.patients.find(p => p.phone === phone);
    if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' });

    const oldName = patient.name;
    patient.name = name !== undefined ? name : patient.name;
    patient.age = age !== undefined ? age : patient.age;
    patient.notes = notes !== undefined ? notes : patient.notes;

    // Sincronización relacional automática en turnos si cambió el nombre
    if (oldName !== patient.name) {
        db.appointments.forEach(appt => {
            if (appt.patientPhone === phone) {
                appt.patientName = patient.name;
            }
        });
    }

    writeData(db);
    res.json(patient);
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});