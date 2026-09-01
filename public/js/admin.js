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
            pinInput.value = '';
        }
    });

    async function initAdmin() {
        await fetchConfig();
        await fetchAppointments();
        renderWeekLabel();
        renderCurrentView();
    }

    async function fetchConfig() {
        const res = await fetch('/api/config');
        config = await res.json();
    }

    async function fetchAppointments() {
        const res = await fetch('/api/appointments');
        appointments = await res.json();
    }

    btnViewTable.addEventListener('click', () => {
        activeView = 'table';
        btnViewTable.classList.add('active');
        btnViewCalendar.classList.remove('active');
        tableView.classList.remove('hidden');
        calendarView.classList.add('hidden');
        renderCurrentView();
    });

    btnViewCalendar.addEventListener('click', () => {
        activeView = 'calendar';
        btnViewCalendar.classList.add('active');
        btnViewTable.classList.remove('active');
        calendarView.classList.remove('hidden');
        tableView.classList.add('hidden');
        renderCurrentView();
    });

    btnPrevWeek.addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        renderWeekLabel();
        renderCurrentView();
    });

    btnNextWeek.addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        renderWeekLabel();
        renderCurrentView();
    });

    function renderCurrentView() {
        if (activeView === 'table') {
            renderTable();
        } else {
            renderCalendar();
        }
    }

    function createGoogleCalendarUrl(name, dateStr, timeStr) {
        const [year, month, day] = dateStr.split('-');
        const [hour, minute] = timeStr.split(':');
        
        const start = new Date(Date.UTC(year, month - 1, day, hour, minute));
        const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hora
        
        const formatGTime = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
        
        const title = encodeURIComponent(`Turno: ${name} - Lic. Gabriela Grimoldi`);
        const details = encodeURIComponent(`Turno de atención profesional con la Lic. Gabriela Grimoldi para ${name}.`);
        const dates = `${formatGTime(start)}/${formatGTime(end)}`;
        
        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`;
    }

    function renderTable() {
        tableBody.innerHTML = '';
        if (appointments.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:30px; color:var(--color-text-muted);">No hay turnos registrados</td></tr>`;
            return;
        }

        appointments.forEach(app => {
            const tr = document.createElement('tr');
            const [year, month, day] = app.date.split('-');
            const formattedDate = `${day}/${month}/${year}`;
            
            let statusBadge = `<span class="badge-status pendiente"><i class="fa-solid fa-clock"></i> Pendiente</span>`;
            if (app.status === 'Confirmado') {
                statusBadge = `<span class="badge-status confirmado"><i class="fa-solid fa-circle-check"></i> Confirmado</span>`;
            } else if (app.status === 'Cancelado') {
                statusBadge = `<span class="badge-status cancelado"><i class="fa-solid fa-ban"></i> Cancelado</span>`;
            }

            const confirmMsg = encodeURIComponent(`Hola *${app.patientName}*, te escribimos para confirmarle su turno reservado para el día *${formattedDate}* a las *${app.time}* hs con la *Lic. Gabriela Grimoldi*. ¡Te esperamos!`);
            const reminderMsg = encodeURIComponent(`Hola *${app.patientName}*, le recordamos su turno agendado para el día *${formattedDate}* a las *${app.time}* hs con la *Lic. Gabriela Grimoldi*. ¡Te esperamos!`);
            const cleanPhone = app.patientPhone.replace(/[^0-9]/g, '');
            const gcalUrl = createGoogleCalendarUrl(app.patientName, app.date, app.time);

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
                <td>${statusBadge}</td>
                <td>
                    <div class="action-group" style="justify-content: flex-end;">
                        <button class="btn-action-circle ficha" onclick="openPatientDrawer('${app.patientPhone}')" title="Ficha / Notas"><i class="fa-solid fa-notes-medical"></i></button>
                        <a class="btn-action-circle gcal" href="${gcalUrl}" target="_blank" title="Añadir a Google Calendar"><i class="fa-solid fa-calendar-plus"></i></a>
                        <a class="btn-action-circle confirm" href="https://wa.me/${cleanPhone}?text=${confirmMsg}" target="_blank" onclick="updateStatus('${app.id}', 'Confirmado')" title="Confirmar por WA"><i class="fa-solid fa-check"></i></a>
                        <a class="btn-action-circle reminder" href="https://wa.me/${cleanPhone}?text=${reminderMsg}" target="_blank" title="Enviar Recordatorio"><i class="fa-solid fa-bell"></i></a>
                        <button class="btn-action-circle cancel" onclick="updateStatus('${app.id}', 'Cancelar')" title="Cancelar Turno"><i class="fa-solid fa-ban"></i></button>
                        <button class="btn-action-circle delete" onclick="deleteAppointment('${app.id}')" title="Eliminar Turno"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    function renderCalendar() {
        calendarView.innerHTML = '';
        const weekDays = getWeekDays(currentWeekStart);
        const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

        calendarView.appendChild(createDiv('grid-header', 'Hora'));
        weekDays.slice(0, 5).forEach((d, idx) => {
            const dayFormatted = `${dayNames[idx]} ${d.getDate()}/${d.getMonth()+1}`;
            calendarView.appendChild(createDiv('grid-header', dayFormatted));
        });

        const allTimes = new Set();
        Object.values(config.schedules || {}).forEach(arr => arr.forEach(t => allTimes.add(t)));
        const sortedTimes = Array.from(allTimes).sort();

        sortedTimes.forEach(time => {
            calendarView.appendChild(createDiv('grid-time-slot', time));

            weekDays.slice(0, 5).forEach((d) => {
                const dayNum = d.getDay();
                const dateStr = formatDateISO(d);
                const allowedTimes = config.schedules[dayNum] || [];

                if (!allowedTimes.includes(time)) {
                    const slot = createDiv('grid-card-slot no-atiende', '<span style="font-size:0.75rem; color:#A0958B; text-align:center;">Sin atención</span>');
                    calendarView.appendChild(slot);
                    return;
                }

                const existingApp = appointments.find(a => a.date === dateStr && a.time === time && a.status !== 'Cancelado');

                if (existingApp) {
                    const slot = createDiv('grid-card-slot ocupado', `
                        <div style="font-size:0.82rem; font-weight:700;">${existingApp.patientName}</div>
                        <div class="action-group" style="margin-top:6px;">
                            <button class="btn-action-circle ficha" style="width:28px; height:28px; font-size:0.75rem;" onclick="openPatientDrawer('${existingApp.patientPhone}')"><i class="fa-solid fa-notes-medical"></i></button>
                            <button class="btn-action-circle cancel" style="width:28px; height:28px; font-size:0.75rem;" onclick="updateStatus('${existingApp.id}', 'Cancelado')"><i class="fa-solid fa-ban"></i></button>
                        </div>
                    `);
                    calendarView.appendChild(slot);
                } else {
                    const slot = createDiv('grid-card-slot disponible', `
                        <span style="font-size:0.78rem; color:var(--color-text-muted);"><i class="fa-solid fa-plus"></i> Disponible</span>
                        <span style="font-size:0.72rem; color:var(--color-primary); font-weight:600;">Agendar</span>
                    `);
                    slot.onclick = () => openManualModal(dateStr, time);
                    calendarView.appendChild(slot);
                }
            });
        });
    }

    window.updateStatus = async (id, status) => {
        await fetch(`/api/appointments/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        await fetchAppointments();
        renderCurrentView();
    };

    window.deleteAppointment = async (id) => {
        if (!confirm('¿Desea eliminar definitivamente este turno?')) return;
        await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
        await fetchAppointments();
        renderCurrentView();
    };

    window.openPatientDrawer = async (phone) => {
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
            const item = document.createElement('div');
            item.style.cssText = "padding:10px; background:var(--color-bg); margin-bottom:6px; border-radius:8px; font-size:0.85rem; display:flex; justify-content:space-between;";
            item.innerHTML = `<span>${h.date} - ${h.time} hs</span><strong>${h.status}</strong>`;
            historyList.appendChild(item);
        });

        patientDrawer.classList.remove('hidden');
    };

    btnCloseDrawer.addEventListener('click', () => patientDrawer.classList.add('hidden'));

    patientForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const phone = document.getElementById('drawerPhone').value;
        const name = document.getElementById('drawerName').value;
        const age = document.getElementById('drawerAge').value;
        const notes = document.getElementById('drawerNotes').value;

        await fetch(`/api/patients/${phone}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, age, notes })
        });

        patientDrawer.classList.add('hidden');
        await fetchAppointments();
        renderCurrentView();
    });

    function openManualModal(date, time) {
        document.getElementById('manualDate').value = date;
        document.getElementById('manualTime').value = time;
        document.getElementById('manualSlotInfo').innerText = `Turno: ${date} a las ${time} hs`;
        manualModal.classList.remove('hidden');
    }

    btnCancelManual.addEventListener('click', () => manualModal.classList.add('hidden'));

    manualForm.addEventListener('submit', async (e) => {
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
            await fetchAppointments();
            renderCurrentView();
        } else {
            alert(data.message);
        }
    });

    btnConfigSchedules.addEventListener('click', () => {
        schedulesInputsContainer.innerHTML = '';
        const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        for (let i = 1; i <= 5; i++) {
            const div = document.createElement('div');
            div.className = 'form-group';
            div.innerHTML = `
                <label>${dayNames[i-1]}</label>
                <input type="text" data-day="${i}" value="${(config.schedules[i] || []).join(', ')}" placeholder="08:00, 09:00">
            `;
            schedulesInputsContainer.appendChild(div);
        }
        schedulesModal.classList.remove('hidden');
    });

    btnCancelSchedules.addEventListener('click', () => schedulesModal.classList.add('hidden'));

    schedulesForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newSchedules = { ...config.schedules };
        const inputs = schedulesInputsContainer.querySelectorAll('input');
        inputs.forEach(input => {
            const day = input.getAttribute('data-day');
            const val = input.value.split(',').map(s => s.trim()).filter(Boolean);
            newSchedules[day] = val;
        });

        const res = await fetch('/api/config/schedules', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schedules: newSchedules })
        });
        const data = await res.json();
        if (data.success) {
            config.schedules = data.schedules;
            schedulesModal.classList.add('hidden');
            renderCurrentView();
        }
    });

    function getMonday(d) {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(date.setDate(diff));
    }

    function getWeekDays(monday) {
        const days = [];
        for (let i = 0; i < 7; i++) {
            const next = new Date(monday);
            next.setDate(monday.getDate() + i);
            days.push(next);
        }
        return days;
    }

    function renderWeekLabel() {
        const monday = currentWeekStart;
        const friday = new Date(monday);
        friday.setDate(monday.getDate() + 4);
        weekLabel.innerText = `Semana del ${monday.getDate()}/${monday.getMonth()+1} al ${friday.getDate()}/${friday.getMonth()+1}, ${monday.getFullYear()}`;
    }

    function formatDateISO(d) {
        return d.toISOString().split('T')[0];
    }

    function createDiv(className, html) {
        const div = document.createElement('div');
        div.className = className;
        div.innerHTML = html;
        return div;
    }
});