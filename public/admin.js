let currentMonday = getMonday(new Date());
let allAppointments = [];
let allPatients = [];

function getMonday(d) {
    d = new Date(d);
    let day = d.getDay(),
        diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

document.addEventListener('DOMContentLoaded', () => {
    // Control de Acceso por Contraseña
    const loginModal = document.getElementById('loginModal');
    const loginForm = document.getElementById('loginForm');
    const adminPasswordInput = document.getElementById('adminPassword');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (adminPasswordInput.value === '1234') {
            loginModal.classList.add('hidden');
            loadData();
        } else {
            alert('Contraseña incorrecta.');
            adminPasswordInput.value = '';
        }
    });

    // Navegación de Semanas
    document.getElementById('prevWeek').addEventListener('click', () => {
        currentMonday.setDate(currentMonday.getDate() - 7);
        renderWeekGrid();
    });

    document.getElementById('nextWeek').addEventListener('click', () => {
        currentMonday.setDate(currentMonday.getDate() + 7);
        renderWeekGrid();
    });

    // Modales
    document.getElementById('closePatientModal').addEventListener('click', () => {
        document.getElementById('patientModal').classList.add('hidden');
    });

    document.getElementById('btnDirectory').addEventListener('click', () => {
        renderDirectory();
        document.getElementById('directoryModal').classList.remove('hidden');
    });

    document.getElementById('closeDirectoryModal').addEventListener('click', () => {
        document.getElementById('directoryModal').classList.add('hidden');
    });

    // Guardar cambios de paciente / ficha
    document.getElementById('patientForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const phone = document.getElementById('modalPatientPhone').value;
        const payload = {
            name: document.getElementById('modalPatientName').value.trim(),
            age: document.getElementById('modalPatientAge').value.trim(),
            notes: document.getElementById('modalPatientNotes').value.trim()
        };

        try {
            const res = await fetch(`/api/patients/${phone}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Error al actualizar ficha');
            alert('Ficha actualizada y turnos sincronizados correctamente.');
            document.getElementById('patientModal').classList.add('hidden');
            loadData();
        } catch (err) {
            alert(err.message);
        }
    });
});

async function loadData() {
    try {
        const [resAppt, resPat] = await Promise.all([
            fetch('/api/appointments'),
            fetch('/api/patients')
        ]);
        allAppointments = await resAppt.json();
        allPatients = await resPat.json();

        renderWeekGrid();
        renderTable();
    } catch (err) {
        console.error('Error cargando datos:', err);
    }
}

// Visualización Sincrónica en Tabla Cronológica con Ordenamiento Estricto
function renderTable() {
    const tbody = document.getElementById('appointmentsTableBody');
    tbody.innerHTML = '';

    // Ordenamiento estricto ascendente por fecha y hora
    const sorted = [...allAppointments].sort((a, b) => {
        return new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`);
    });

    if (sorted.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-secondary);">No hay turnos registrados.</td></tr>`;
        return;
    }

    sorted.forEach(appt => {
        const tr = document.createElement('tr');
        const [yyyy, mm, dd] = appt.date.split('-');
        const dateFormatted = `${dd}/${mm}/${yyyy}`;

        let statusClass = 'pendiente';
        if (appt.status === 'Confirmado') statusClass = 'confirmado';
        if (appt.status === 'Cancelado') statusClass = 'cancelado';

        tr.innerHTML = `
            <td>${dateFormatted} - ${appt.time} hs</td>
            <td><strong>${appt.patientName}</strong></td>
            <td>${appt.patientPhone}</td>
            <td><span class="badge ${statusClass}">${appt.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="circle-btn btn-ficha" title="Ver Ficha / Notas" onclick="openPatientModal('${appt.patientPhone}')">📋</button>
                    <a class="circle-btn btn-whatsapp" title="Confirmar y Enviar WhatsApp" href="${getWhatsAppLink(appt, 'confirm')}" target="_blank" onclick="updateStatus('${appt.id}', 'Confirmado')">✔</a>
                    <a class="circle-btn btn-reminder" title="Enviar Recordatorio WhatsApp" href="${getWhatsAppLink(appt, 'reminder')}" target="_blank">💬</a>
                    <button class="circle-btn btn-cancel" title="Cancelar Turno" onclick="updateStatus('${appt.id}', 'Cancelado')">✖</button>
                    <button class="circle-btn btn-delete" title="Eliminar Turno" onclick="deleteAppointment('${appt.id}')">🗑</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Generador de Enlaces WhatsApp con las Plantillas Exactas Exigidas
function getWhatsAppLink(appt, type) {
    const [yyyy, mm, dd] = appt.date.split('-');
    const dateFormatted = `${dd}/${mm}/${yyyy}`;
    let message = '';

    if (type === 'confirm') {
        message = `Hola *${appt.patientName}*, te escribimos para confirmarle su turno reservado para el día *${dateFormatted}* a las *${appt.time}* hs con la *Lic. Gabriela Grimoldi*. ¡Te esperamos!`;
    } else if (type === 'reminder') {
        message = `Hola *${appt.patientName}*, le recordamos su turno agendado para el día *${dateFormatted}* a las *${appt.time}* hs con la *Lic. Gabriela Grimoldi*. ¡Te esperamos!`;
    }

    const cleanPhone = appt.patientPhone.replace(/\D/g, '');
    return `https://wa.me/549${cleanPhone}?text=${encodeURIComponent(message)}`;
}

async function updateStatus(id, newStatus) {
    try {
        await fetch(`/api/appointments/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        loadData();
    } catch (err) {
        console.error(err);
    }
}

async function deleteAppointment(id) {
    if (!confirm('¿Está seguro de eliminar este turno de forma permanente?')) return;
    try {
        await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
        loadData();
    } catch (err) {
        console.error(err);
    }
}

// Abrir Ficha de Paciente por Teléfono
window.openPatientModal = function(phone) {
    const patient = allPatients.find(p => p.phone === phone) || { phone, name: '', age: '', notes: '' };
    document.getElementById('modalPatientName').value = patient.name;
    document.getElementById('modalPatientPhone').value = patient.phone;
    document.getElementById('modalPatientAge').value = patient.age || '';
    document.getElementById('modalPatientNotes').value = patient.notes || '';
    document.getElementById('patientModal').classList.remove('hidden');
};

// Renderizar Grilla Semanal
function renderWeekGrid() {
    const container = document.getElementById('weekGridContainer');
    container.innerHTML = '';

    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    const horariosPorDia = {
        1: ['08:00', '09:00', '10:00', '18:00', '19:00'],
        2: ['15:00', '16:00', '17:00', '18:00'],
        3: ['08:00', '09:00', '10:00', '18:00', '19:00'],
        4: ['14:00', '15:00', '16:00', '17:00', '18:00'],
        5: ['14:00', '15:00', '16:00', '17:00']
    };

    let mondayCopy = new Date(currentMonday);
    document.getElementById('currentWeekLabel').textContent = `Semana del ${mondayCopy.toLocaleDateString('es-AR')}`;

    for (let i = 0; i < 5; i++) {
        let currentDayDate = new Date(mondayCopy);
        currentDayDate.setDate(mondayCopy.getDate() + i);
        const dateStr = currentDayDate.toISOString().split('T')[0];
        const dayOfWeek = i + 1; // 1: Lunes ... 5: Viernes

        const col = document.createElement('div');
        col.className = 'day-column';
        col.innerHTML = `<h4>${days[i]}<br><span style="font-size:0.8rem; font-weight:normal;">${currentDayDate.toLocaleDateString('es-AR')}</span></h4>`;

        const slots = horariosPorDia[dayOfWeek] || [];
        slots.forEach(time => {
            const appointment = allAppointments.find(a => a.date === dateStr && a.time === time && a.status !== 'Cancelado');
            const slotCard = document.createElement('div');

            if (appointment) {
                slotCard.className = 'slot-card occupied';
                slotCard.innerHTML = `
                    <strong>${time} hs</strong><br>
                    <span>${appointment.patientName}</span><br>
                    <span class="badge ${appointment.status.toLowerCase()}" style="font-size:0.65rem; margin-top:4px;">${appointment.status}</span>
                `;
            } else {
                slotCard.className = 'slot-card free';
                slotCard.innerHTML = `<strong>${time} hs</strong><br><span style="font-size:0.75rem;">Disponible</span>`;
            }
            col.appendChild(slotCard);
        });

        container.appendChild(col);
    }
}

// Directorio Centralizado de Pacientes
function renderDirectory() {
    const container = document.getElementById('directoryContent');
    if (allPatients.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No hay pacientes registrados en el directorio.</p>';
        return;
    }

    let html = '<table><thead><tr><th>Nombre</th><th>Teléfono</th><th>Edad</th><th>Visitas Registradas</th><th>Acciones</th></tr></thead><tbody>';
    allPatients.forEach(p => {
        html += `
            <tr>
                <td><strong>${p.name}</strong></td>
                <td>${p.phone}</td>
                <td>${p.age || '-'}</td>
                <td>${p.history ? p.history.length : 0} visitas</td>
                <td>
                    <button class="circle-btn btn-ficha" onclick="openPatientModal('${p.phone}')">📋</button>
                </td>
            </tr>
        `;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}