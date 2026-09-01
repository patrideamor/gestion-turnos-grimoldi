document.addEventListener('DOMContentLoaded', () => {
    let config = {};
    let appointments = [];

    const dateInput = document.getElementById('bookingDate');
    const slotsContainer = document.getElementById('availableSlots');
    const bookingForm = document.getElementById('bookingForm');

    // Inicializar fecha mínima a hoy
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
        dateInput.value = today;

        initPublicView();

        dateInput.addEventListener('change', renderSlots);
    }

    async function initPublicView() {
        const resConfig = await fetch('/api/config');
        config = await resConfig.json();

        const resApps = await fetch('/api/appointments');
        appointments = await resApps.json();

        renderSlots();
    }

    function renderSlots() {
        if (!slotsContainer || !dateInput.value) return;

        slotsContainer.innerHTML = '';
        const selectedDate = new Date(dateInput.value + 'T00:00:00');
        const dayOfWeek = selectedDate.getDay(); // 0..6

        const allowedTimes = config.schedules[dayOfWeek] || [];

        if (allowedTimes.length === 0) {
            slotsContainer.innerHTML = '<p style="color:var(--color-text-muted); font-size:0.9rem;">No hay horarios disponibles para esta fecha.</p>';
            return;
        }

        allowedTimes.forEach(time => {
            const isTaken = appointments.some(a => a.date === dateInput.value && a.time === time && a.status !== 'Cancelado');

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn-slot' + (isTaken ? ' taken' : '');
            btn.innerText = time + ' hs';
            btn.disabled = isTaken;

            if (!isTaken) {
                btn.onclick = () => {
                    document.querySelectorAll('.btn-slot').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    document.getElementById('selectedTime').value = time;
                };
            }

            slotsContainer.appendChild(btn);
        });
    }

    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const time = document.getElementById('selectedTime').value;
            if (!time) {
                alert('Por favor, selecciona un horario disponible.');
                return;
            }

            const payload = {
                name: document.getElementById('patientName').value,
                phone: document.getElementById('patientPhone').value,
                age: document.getElementById('patientAge').value,
                date: dateInput.value,
                time: time
            };

            const res = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                alert('¡Turno reservado con éxito en estado Pendiente! La profesional confirmará su sesión.');
                bookingForm.reset();
                initPublicView();
            } else {
                alert(data.message);
            }
        });
    }
});