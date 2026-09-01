document.addEventListener('DOMContentLoaded', () => {
    let currentWeekStart = getMonday(new Date());
    let appointments = [];
    let config = {};
    let activeView = 'table';

    const authModal = document.getElementById('authModal');
    const loginForm = document.getElementById('loginForm');
    const pinInput = document.getElementById('pinInput');
    const adminContent = document.getElementById('adminContent');

    const btnViewTable = document.getElementById('btnViewTable');
    const btnViewCalendar = document.getElementById('btnViewCalendar');
    const tableView = document.getElementById('tableView');
    const calendarView = document.getElementById('calendarView');

    const weekLabel = document.getElementById('weekLabel');
    const btnPrevWeek = document.getElementById('btnPrevWeek');
    const btnNextWeek = document.getElementById('btnNextWeek');

    const tableBody = document.getElementById('tableBody');

    const patientDrawer = document.getElementById('patientDrawer');
    const btnCloseDrawer = document.getElementById('btnCloseDrawer');
    const patientForm = document.getElementById('patientForm');

    const manualModal = document.getElementById('manualAppointmentModal');
    const manualForm = document.getElementById('manualAppointmentForm');
    const btnCancelManual = document.getElementById('btnCancelManual');

    const schedulesModal = document.getElementById('schedulesModal');
    const btnConfigSchedules = document.getElementById('btnConfigSchedules');
    const btnCancelSchedules = document.getElementById('btnCancelSchedules');
    const schedulesForm = document.getElementById('schedulesForm');
    const schedulesInputsContainer = document.getElementById('schedulesInputsContainer');

    checkAuth();

    async function checkAuth() {
        try {
            const res = await fetch('/auth/status');
            const data = await res.json();
            if (data.isAdmin) {
                authModal.classList.add('hidden');
                adminContent.classList.remove('hidden');
                initAdmin();
            } else {
                authModal.classList.remove('hidden');
                adminContent.classList.add('hidden');
            }
        } catch (e) {
            console.error(e);
        }
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const res = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: pinInput.value })
        });
        const data = await res.json();
        if (data.success) {
            authModal.classList.add('hidden');
            adminContent.classList.remove('hidden');
            initAdmin();
        } else {
            alert(data.message);
        }
    });

    async function initAdmin() {
        await loadConfig();
        await loadAppointments();
    }

    async function loadConfig() {
        const res = await fetch('/api/config');
        config = await res.json();
    }

    async function loadAppointments() {
        const res = await fetch('/api/appointments');
        appointments = await res.json();
        render();
    }

    function render() {
        updateWeekLabel();
        if (activeView === 'table') {
            renderTable();
        } else {
            renderCalendar();
        }
    }

    function renderTable() {
        tableBody.innerHTML = '';
        if (appointments.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--color-text-muted);">No hay turnos registrados</td></tr>`;
            return;
        }

        appointments.forEach(app => {
            const tr = document.createElement('tr');
            const [y, m, d] = app.date.split('-');
            const formattedDate = `${d}/${m}/${y}`;
            const isPending = app.status === 'Pendiente';

            tr.innerHTML = `
                <td>
                    <strong>${formattedDate}</strong><br>
                    <small style="color: var(--color-text-muted);">${app.time} hs</small>
                </td>
                <td>
                    <div class="patient-cell">
                        <span class="patient-name">${app.patientName}</span>
                        <span class="patient-phone"><i class="fa-brands fa-whatsapp"></i> ${app.patientPhone}</span>
                    </div>
                </td>
                <td>
                    <span class="badge-status ${app.status.toLowerCase()}">
                        <i class="fa-solid ${isPending ? 'fa-clock' : 'fa-circle-check'}"></i> ${app.status}
                    </span>
                </td>
                <td>
                    <div class="action-group" style="justify-content: flex-end;">
                        <button class="btn-action-circle ficha" onclick="openDrawer('${app.patientPhone}')" title="Ficha Clínica"><i class="fa-solid fa-notes-medical"></i></button>
                        <button class="btn-action-circle confirm" onclick="confirmAppointment('${app.id}', '${app.patientName}', '${formattedDate}', '${app.time}', '${app.patientPhone}')" title="Confirmar por WhatsApp"><i class="fa-solid fa-check"></i></button>
                        <button class="btn-action-circle reminder" onclick="sendReminder('${app.patientName}', '${formattedDate}', '${app.time}', '${app.patientPhone}')" title="Recordatorio"><i class="fa-solid fa-bell"></i></button>
                        <button class="btn-action-circle gcal" onclick="addToGoogleCalendar('${app.id}')" title="Agregar a Google Calendar"><i class="fa-solid fa-calendar-plus"></i></button>
                        <button class="btn-action-circle cancel" onclick="cancelAppointment('${app.id}')" title="Cancelar Turno"><i class="fa-solid fa-ban"></i></button>
                        <button class="btn-action-circle delete" onclick="deleteAppointment('${app.id}')" title="Eliminar Turno"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    function renderCalendar() {
        calendarView.innerHTML = '';
        const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        
        calendarView.appendChild(createDiv('grid-header', 'Hora'));
        dayNames.forEach((name, i) => {
            const dateObj = new Date(currentWeekStart);
            dateObj.setDate(dateObj.getDate() + i);
            const dateStr = formatDate(dateObj);
            calendarView.appendChild(createDiv('grid-header', `${name}<br><small style="font-weight:400">${dateStr.split('-').reverse().slice(0,2).join('/')}</small>`));
        });

        const allHours = ["08:00", "09:00", "10:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];

        allHours.forEach(hour => {
            calendarView.appendChild(createDiv('grid-time-slot', hour));

            for (let dayIdx = 1; dayIdx <= 5; dayIdx++) {
                const dayDate = new Date(currentWeekStart);
                dayDate.setDate(dayDate.getDate() + (dayIdx - 1));
                const dateStr = formatDate(dayDate);

                const activeSchedules = config.schedules[dayIdx] || [];
                const isScheduledTime = activeSchedules.includes(hour);
                const app = appointments.find(a => a.date === dateStr && a.time === hour && a.status !== 'Cancelado');

                const slot = document.createElement('div');

                if (app) {
                    slot.className = 'grid-card-slot ocupado';
                    slot.innerHTML = `
                        <div style="font-size: 0.82rem; font-weight:700;">${app.patientName}</div>
                        <div class="action-group" style="margin-top: 4px;">
                            <button class="btn-action-circle ficha" style="width:26px;height:26px;font-size:0.75rem" onclick="openDrawer('${app.patientPhone}')"><i class="fa-solid fa-notes-medical"></i></button>
                            <button class="btn-action-circle gcal" style="width:26px;height:26px;font-size:0.75rem" onclick="addToGoogleCalendar('${app.id}')"><i class="fa-solid fa-calendar-plus"></i></button>
                        </div>
                    `;
                } else if (isScheduledTime) {
                    slot.className = 'grid-card-slot disponible';
                    slot.innerHTML = `<span style="font-size: 0.78rem; color: var(--color-primary); font-weight:600;"><i class="fa-solid fa-plus"></i> Disponible</span>`;
                    slot.onclick = () => openManualModal(dateStr, hour);
                } else {
                    slot.className = 'grid-card-slot no-atiende';
                    slot.innerHTML = `<span style="font-size: 0.72rem; color: var(--color-text-muted);">Sin atención</span>`;
                }
                calendarView.appendChild(slot);
            }
        });
    }

    // Acciones de WhatsApp y Google Calendar
    window.confirmAppointment = async (id, name, date, time, phone) => {
        await fetch(`/api/appointments/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Confirmado' })
        });
        const msg = encodeURIComponent(`Hola ${name}, te escribimos para confirmarle su turno reservado para el día ${date} a las ${time} hs con la Lic. Gabriela Grimoldi. ¡Te esperamos!`);
        window.open(`https://wa.me/${cleanPhone(phone)}?text=${msg}`, '_blank');
        loadAppointments();
    };

    window.sendReminder = (name, date, time, phone) => {
        const msg = encodeURIComponent(`Hola ${name}, le recordamos su turno agendado para el día ${date} a las ${time} hs con la Lic. Gabriela Grimoldi. ¡Te esperamos!`);
        window.open(`https://wa.me/${cleanPhone(phone)}?text=${msg}`, '_blank');
    };

    window.addToGoogleCalendar = async (id) => {
        const res = await fetch(`/api/appointments/${id}/gcal`);
        const data = await res.json();
        if (data.success) {
            window.open(data.url, '_blank');
        }
    };

    window.cancelAppointment = async (id) => {
        if (!confirm('¿Cancelar este turno?')) return;
        await fetch(`/api/appointments/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Cancelado' })
        });
        loadAppointments();
    };

    window.deleteAppointment = async (id) => {
        if (!confirm('¿Eliminar permanentemente este turno?')) return;
        await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
        loadAppointments();
    };

    // Ficha del Paciente Slide-Over
    window.openDrawer = async (phone) => {
        const res = await fetch(`/api/patients/${phone}`);
        const data = await res.json();
        if (!data.patient) return;

        document.getElementById('drawerPhone').value = data.patient.phone;
        document.getElementById('drawerName').value = data.patient.name;
        document.getElementById('drawerAge').value = data.patient.age || '';
        document.getElementById('drawerNotes').value = data.patient.notes || '';

        const historyList = document.getElementById('patientHistoryList');
        historyList.innerHTML = '';
        data.history.forEach(h => {
            const div = document.createElement('div');
            div.style.cssText = 'padding:10px; background:var(--color-bg); margin-bottom:6px; border-radius:8px; font-size:0.82rem; display:flex; justify-content:space-between;';
            div.innerHTML = `<span>${h.date.split('-').reverse().join('/')} - ${h.time} hs</span><strong>${h.status}</strong>`;
            historyList.appendChild(div);
        });

        patientDrawer.classList.remove('hidden');
    };

    btnCloseDrawer.onclick = () => patientDrawer.classList.add('hidden');

    patientForm.onsubmit = async (e) => {
        e.preventDefault();
        const phone = document.getElementById('drawerPhone').value;
        await fetch(`/api/patients/${phone}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: document.getElementById('drawerName').value,
                age: document.getElementById('drawerAge').value,
                notes: document.getElementById('drawerNotes').value
            })
        });
        patientDrawer.classList.add('hidden');
        loadAppointments();
    };

    // Carga Manual de Turnos
    function openManualModal(date, time) {
        document.getElementById('manualDate').value = date;
        document.getElementById('manualTime').value = time;
        document.getElementById('manualSlotInfo').innerText = `Turno: ${date.split('-').reverse().join('/')} a las ${time} hs`;
        manualModal.classList.remove('hidden');
    }

    btnCancelManual.onclick = () => manualModal.classList.add('hidden');

    manualForm.onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
            date: document.getElementById('manualDate').value,
            time: document.getElementById('manualTime').value,
            name: document.getElementById('manualName').value,
            phone: document.getElementById('manualPhone').value,
            age: document.getElementById('manualAge').value
        };

        const res = await fetch('/api/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            manualModal.classList.add('hidden');
            manualForm.reset();
            loadAppointments();
        } else {
            alert(data.message);
        }
    };

    // Configuración interactiva de Horarios
    btnConfigSchedules.onclick = () => {
        schedulesInputsContainer.innerHTML = '';
        const dayLabels = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

        dayLabels.forEach((label, idx) => {
            const dayNum = idx + 1;
            const currentSlots = (config.schedules[dayNum] || []).join(', ');
            const group = document.createElement('div');
            group.className = 'form-group';
            group.innerHTML = `
                <label>${label}</label>
                <input type="text" id="sched_day_${dayNum}" value="${currentSlots}" placeholder="Ej: 08:00, 09:00, 18:00">
            `;
            schedulesInputsContainer.appendChild(group);
        });
        schedulesModal.classList.remove('hidden');
    };

    btnCancelSchedules.onclick = () => schedulesModal.classList.add('hidden');

    schedulesForm.onsubmit = async (e) => {
        e.preventDefault();
        const newSchedules = { "0": [], "6": [] };
        for (let dayNum = 1; dayNum <= 5; dayNum++) {
            const val = document.getElementById(`sched_day_${dayNum}`).value;
            newSchedules[dayNum] = val.split(',').map(s => s.trim()).filter(s => s.length > 0);
        }

        const res = await fetch('/api/config/schedules', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schedules: newSchedules })
        });
        const data = await res.json();
        if (data.success) {
            config.schedules = data.schedules;
            schedulesModal.classList.add('hidden');
            render();
        }
    };

    // Vistas y Navegación
    btnViewTable.onclick = () => {
        activeView = 'table';
        btnViewTable.classList.add('active');
        btnViewCalendar.classList.remove('active');
        tableView.classList.remove('hidden');
        calendarView.classList.add('hidden');
        render();
    };

    btnViewCalendar.onclick = () => {
        activeView = 'calendar';
        btnViewCalendar.classList.add('active');
        btnViewTable.classList.remove('active');
        calendarView.classList.remove('hidden');
        tableView.classList.add('hidden');
        render();
    };

    btnPrevWeek.onclick = () => {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        render();
    };

    btnNextWeek.onclick = () => {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        render();
    };

    // Helpers
    function getMonday(d) {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(date.setDate(diff));
    }

    function formatDate(d) {
        return d.toISOString().split('T')[0];
    }

    function cleanPhone(phone) {
        return phone.replace(/[^0-9]/g, '');
    }

    function updateWeekLabel() {
        const endWeek = new Date(currentWeekStart);
        endWeek.setDate(endWeek.getDate() + 4);
        weekLabel.innerText = `Semana del ${currentWeekStart.getDate()} al ${endWeek.getDate()} de ${currentWeekStart.toLocaleString('es-ES', { month: 'short' })}, ${currentWeekStart.getFullYear()}`;
    }

    function createDiv(className, innerHTML) {
        const div = document.createElement('div');
        div.className = className;
        div.innerHTML = innerHTML;
        return div;
    }
})
function generateGoogleCalendarUrl(title, date, time, details) {
  const startDateTime = new Date(`${date}T${time}:00`);
  const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // Bloque de 1 hora
  
  const isoStart = startDateTime.toISOString().replace(/-|:|\.\d+/g, '');
  const isoEnd = endDateTime.toISOString().replace(/-|:|\.\d+/g, '');
  
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${isoStart}/${isoEnd}&details=${encodeURIComponent(details)}`;
};
