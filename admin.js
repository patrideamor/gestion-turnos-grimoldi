import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, collection, doc, getDoc, setDoc, getDocs, updateDoc, deleteDoc, query, where, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// REEMPLAZAR CON TU CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCBIiWsDLM5F5x66eEHfIbFg5TDWniOt2E",
  authDomain: "sistema-turnos-gabriela.firebaseapp.com",
  projectId: "sistema-turnos-gabriela",
  storageBucket: "sistema-turnos-gabriela.firebasestorage.app",
  messagingSenderId: "1057274652170",
  appId: "1:1057274652170:web:c79bb817f05308874221f3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DEFAULT_SCHEDULES = {
    "1": ["08:00", "09:00", "18:00", "19:00", "20:00"],
    "2": ["15:00", "16:00", "17:00", "18:00"],
    "3": ["08:00", "09:00", "10:00", "18:00", "19:00"],
    "4": ["14:00", "15:00", "16:00", "17:00", "18:00"],
    "5": ["14:00", "15:00", "16:00", "17:00"],
    "6": [], "0": []
};

let currentWeekStart = getMonday(new Date());
let appointments = [];
let schedulesConfig = DEFAULT_SCHEDULES;
let activeView = 'table';

document.addEventListener('DOMContentLoaded', () => {
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

    // Validación PIN 2782 Local
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (pinInput.value === "2782") {
            authModal.classList.add('hidden');
            adminContent.classList.remove('hidden');
            initAdmin();
        } else {
            alert("Contraseña incorrecta");
            pinInput.value = '';
        }
    });

    async function initAdmin() {
        listenToSchedules();
        listenToAppointments();
        renderWeekLabel();
    }

    function listenToSchedules() {
        onSnapshot(doc(db, "config", "schedules"), (docSnap) => {
            if (docSnap.exists()) {
                schedulesConfig = docSnap.data().schedules;
            } else {
                setDoc(doc(db, "config", "schedules"), { schedules: DEFAULT_SCHEDULES });
            }
            renderCurrentView();
        });
    }

    function listenToAppointments() {
        onSnapshot(collection(db, "appointments"), (snapshot) => {
            appointments = [];
            snapshot.forEach(docSnap => {
                appointments.push({ id: docSnap.id, ...docSnap.data() });
            });
            // Ordenamiento Estricto Ascendente por Fecha y Hora
            appointments.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
            renderCurrentView();
        });
    }

    // Swappers de Vistas
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
        if (activeView === 'table') renderTable();
        else renderCalendar();
    }

    function renderTable() {
        const tableBody = document.getElementById('tableBody');
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
            if (app.status === 'Confirmado') statusBadge = `<span class="badge-status confirmado"><i class="fa-solid fa-circle-check"></i> Confirmado</span>`;
            else if (app.status === 'Cancelado') statusBadge = `<span class="badge-status cancelado"><i class="fa-solid fa-ban"></i> Cancelado</span>`;

            const confirmMsg = encodeURIComponent(`Hola *${app.patientName}*, te escribimos para confirmarle su turno reservado para el día *${formattedDate}* a las *${app.time}* hs con la *Lic. Gabriela Grimoldi*. ¡Te esperamos!`);
            const reminderMsg = encodeURIComponent(`Hola *${app.patientName}*, le recordamos su turno agendado para el día *${formattedDate}* a las *${app.time}* hs con la *Lic. Gabriela Grimoldi*. ¡Te esperamos!`);
            const cleanPhone = app.patientPhone.replace(/[^0-9]/g, '');

            const gCalUrl = getGoogleCalendarUrl(app.patientName, app.date, app.time);

            tr.innerHTML = `
                <td><strong>${formattedDate}</strong><br><small style="color: var(--color-text-muted);">${app.time} hs</small></td>
                <td><div class="patient-cell"><span class="patient-name">${app.patientName}</span><span class="patient-phone"><i class="fa-brands fa-whatsapp"></i> ${app.patientPhone}</span></div></td>
                <td>${statusBadge}</td>
                <td>
                    <div class="action-group" style="justify-content: flex-end;">
                        <button class="btn-action-circle ficha" data-id="${app.patientPhone}" title="Ficha / Notas"><i class="fa-solid fa-notes-medical"></i></button>
                        <a class="btn-action-circle gcalendar" href="${gCalUrl}" target="_blank" title="Agregar a Google Calendar"><i class="fa-solid fa-calendar-plus"></i></a>
                        <a class="btn-action-circle confirm" href="https://wa.me/${cleanPhone}?text=${confirmMsg}" target="_blank" data-id="${app.id}" title="Confirmar por WA"><i class="fa-solid fa-check"></i></a>
                        <a class="btn-action-circle reminder" href="https://wa.me/${cleanPhone}?text=${reminderMsg}" target="_blank" title="Enviar Recordatorio"><i class="fa-solid fa-bell"></i></a>
                        <button class="btn-action-circle cancel" data-id="${app.id}" title="Cancelar Turno"><i class="fa-solid fa-ban"></i></button>
                        <button class="btn-action-circle delete" data-id="${app.id}" title="Eliminar Turno"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            `;

            // Event Listeners de Botonera
            tr.querySelector('.ficha').onclick = () => openPatientDrawer(app.patientPhone);
            tr.querySelector('.confirm').onclick = () => updateStatus(app.id, 'Confirmado');
            tr.querySelector('.cancel').onclick = () => updateStatus(app.id, 'Cancelado');
            tr.querySelector('.delete').onclick = () => deleteAppointment(app.id);

            tableBody.appendChild(tr);
        });
    }

    function renderCalendar() {
        calendarView.innerHTML = '';
        const weekDays = getWeekDays(currentWeekStart);
        const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

        calendarView.appendChild(createDiv('grid-header', 'Hora'));
        weekDays.slice(0, 5).forEach((d, idx) => {
            calendarView.appendChild(createDiv('grid-header', `${dayNames[idx]} ${d.getDate()}/${d.getMonth()+1}`));
        });

        const allTimes = new Set();
        Object.values(schedulesConfig || {}).forEach(arr => arr.forEach(t => allTimes.add(t)));
        const sortedTimes = Array.from(allTimes).sort();

        sortedTimes.forEach(time => {
            calendarView.appendChild(createDiv('grid-time-slot', time));

            weekDays.slice(0, 5).forEach((d) => {
                const dayNum = d.getDay();
                const dateStr = formatDateISO(d);
                const allowedTimes = schedulesConfig[dayNum] || [];

                if (!allowedTimes.includes(time)) {
                    calendarView.appendChild(createDiv('grid-card-slot no-atiende', '<span style="font-size:0.75rem; color:#A0958B; text-align:center;">Sin atención</span>'));
                    return;
                }

                const existingApp = appointments.find(a => a.date === dateStr && a.time === time && a.status !== 'Cancelado');

                if (existingApp) {
                    const slot = createDiv('grid-card-slot ocupado', `
                        <div style="font-size:0.82rem; font-weight:700;">${existingApp.patientName}</div>
                        <div class="action-group" style="margin-top:6px;">
                            <button class="btn-action-circle ficha" style="width:28px; height:28px; font-size:0.75rem;"><i class="fa-solid fa-notes-medical"></i></button>
                            <button class="btn-action-circle cancel" style="width:28px; height:28px; font-size:0.75rem;"><i class="fa-solid fa-ban"></i></button>
                        </div>
                    `);
                    slot.querySelector('.ficha').onclick = () => openPatientDrawer(existingApp.patientPhone);
                    slot.querySelector('.cancel').onclick = () => updateStatus(existingApp.id, 'Cancelado');
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

    // Google Calendar Link Generator
    function getGoogleCalendarUrl(patientName, dateStr, timeStr) {
        const [year, month, day] = dateStr.split('-');
        const [hours, minutes] = timeStr.split(':');
        const startObj = new Date(year, month - 1, day, hours, minutes);
        const endObj = new Date(startObj.getTime() + 60 * 60 * 1000);
        const formatTime = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
        const title = encodeURIComponent(`Turno: ${patientName} - Lic. Gabriela Grimoldi`);
        const details = encodeURIComponent(`Turno asignado para ${patientName}.`);
        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatTime(startObj)}/${formatTime(endObj)}&details=${details}`;
    }

    // Operaciones en Firestore
    async function updateStatus(id, status) {
        await updateDoc(doc(db, "appointments", id), { status });
    }

    async function deleteAppointment(id) {
        if (confirm('¿Desea eliminar este turno de la base de datos?')) {
            await deleteDoc(doc(db, "appointments", id));
        }
    }

    // Ficha Relacional Actualizable en Cascadas
    async function openPatientDrawer(phone) {
        const cleanPhone = phone.trim();
        const patientDoc = await getDoc(doc(db, "patients", cleanPhone));
        
        document.getElementById('drawerPhone').value = cleanPhone;
        if (patientDoc.exists()) {
            const pData = patientDoc.data();
            document.getElementById('drawerName').value = pData.name || '';
            document.getElementById('drawerAge').value = pData.age || '';
            document.getElementById('drawerNotes').value = pData.notes || '';
        } else {
            document.getElementById('drawerName').value = '';
            document.getElementById('drawerAge').value = '';
            document.getElementById('drawerNotes').value = '';
        }

        const q = query(collection(db, "appointments"), where("patientPhone", "==", cleanPhone));
        const historySnap = await getDocs(q);
        const historyList = document.getElementById('patientHistoryList');
        historyList.innerHTML = '';
        historySnap.forEach(docSnap => {
            const h = docSnap.data();
            const item = document.createElement('div');
            item.style.cssText = "padding:10px; background:var(--color-bg); margin-bottom:6px; border-radius:8px; font-size:0.85rem; display:flex; justify-content:space-between;";
            item.innerHTML = `<span>${h.date} - ${h.time} hs</span><strong>${h.status}</strong>`;
            historyList.appendChild(item);
        });

        patientDrawer.classList.remove('hidden');
    }

    btnCloseDrawer.addEventListener('click', () => patientDrawer.classList.add('hidden'));

    patientForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const phone = document.getElementById('drawerPhone').value;
        const name = document.getElementById('drawerName').value;
        const age = document.getElementById('drawerAge').value;
        const notes = document.getElementById('drawerNotes').value;

        // Guardar o Actualizar Ficha de Paciente
        await setDoc(doc(db, "patients", phone), { name, phone, age, notes }, { merge: true });

        // Sincronización Relacional en Cascada sobre todas las visitas asociadas al teléfono
        const q = query(collection(db, "appointments"), where("patientPhone", "==", phone));
        const querySnap = await getDocs(q);
        querySnap.forEach(async (docSnap) => {
            await updateDoc(doc(docSnap.ref.path), { patientName: name });
        });

        patientDrawer.classList.add('hidden');
    });

    // Carga Manual
    function openManualModal(date, time) {
        document.getElementById('manualDate').value = date;
        document.getElementById('manualTime').value = time;
        document.getElementById('manualSlotInfo').innerText = `Turno: ${date} a las ${time} hs`;
        manualModal.classList.remove('hidden');
    }

    btnCancelManual.addEventListener('click', () => manualModal.classList.add('hidden'));

    manualForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const date = document.getElementById('manualDate').value;
        const time = document.getElementById('manualTime').value;
        const name = document.getElementById('manualName').value;
        const phone = document.getElementById('manualPhone').value.trim();
        const age = document.getElementById('manualAge').value;

        // Registrar paciente si no existe
        await setDoc(doc(db, "patients", phone), { name, phone, age }, { merge: true });

        // Crear turno
        await setDoc(doc(collection(db, "appointments")), {
            patientPhone: phone,
            patientName: name,
            date, time,
            status: "Pendiente",
            createdAt: new Date().toISOString()
        });

        manualModal.classList.add('hidden');
        manualForm.reset();
    });

    // Editor de Horarios
    btnConfigSchedules.addEventListener('click', () => {
        schedulesInputsContainer.innerHTML = '';
        const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        for (let i = 1; i <= 5; i++) {
            const div = document.createElement('div');
            div.className = 'form-group';
            div.innerHTML = `
                <label>${dayNames[i-1]}</label>
                <input type="text" data-day="${i}" value="${(schedulesConfig[i] || []).join(', ')}" placeholder="08:00, 09:00">
            `;
            schedulesInputsContainer.appendChild(div);
        }
        schedulesModal.classList.remove('hidden');
    });

    btnCancelSchedules.addEventListener('click', () => schedulesModal.classList.add('hidden'));

    schedulesForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newSchedules = { ...schedulesConfig };
        schedulesInputsContainer.querySelectorAll('input').forEach(input => {
            const day = input.getAttribute('data-day');
            newSchedules[day] = input.value.split(',').map(s => s.trim()).filter(Boolean);
        });

        await setDoc(doc(db, "config", "schedules"), { schedules: newSchedules });
        schedulesModal.classList.add('hidden');
    });

    // Utilitarios
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

    function formatDateISO(d) { return d.toISOString().split('T')[0]; }
    function createDiv(className, html) {
        const div = document.createElement('div');
        div.className = className;
        div.innerHTML = html;
        return div;
    }
});