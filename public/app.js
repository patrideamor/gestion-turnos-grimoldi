document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('appointmentDate');
    const timeSelect = document.getElementById('appointmentTime');
    const form = document.getElementById('bookingForm');

    // Reglas de Negocio estrictas de horarios (Lunes a Viernes)
    const horariosAtencion = {
        1: ['08:00', '09:00', '10:00', '18:00', '19:00'], // Lunes
        2: ['15:00', '16:00', '17:00', '18:00'],             // Martes
        3: ['08:00', '09:00', '10:00', '18:00', '19:00'], // Miércoles
        4: ['14:00', '15:00', '16:00', '17:00', '18:00'], // Jueves
        5: ['14:00', '15:00', '16:00', '17:00']              // Viernes
    };

    // Bloquear fechas pasadas y fines de semana por defecto
    const todayStr = new Date().toISOString().split('T')[0];
    dateInput.min = todayStr;

    dateInput.addEventListener('change', async () => {
        const selectedDate = new Date(dateInput.value + 'T00:00:00');
        const dayOfWeek = selectedDate.getDay(); // 0: Dom, 6: Sáb

        timeSelect.innerHTML = '<option value="">Cargando horarios...</option>';

        if (dayOfWeek === 0 || dayOfWeek === 6) {
            alert('Los fines de semana no hay atención disponible.');
            dateInput.value = '';
            timeSelect.innerHTML = '<option value="">Seleccione un día hábil</option>';
            return;
        }

        const bloquesPermitidos = horariosAtencion[dayOfWeek] || [];

        try {
            const res = await fetch('/api/appointments');
            const appointments = await res.json();

            // Filtrar turnos ya ocupados en esa fecha
            const ocupados = appointments
                .filter(a => a.date === dateInput.value && a.status !== 'Cancelado')
                .map(a => a.time);

            const disponibles = bloquesPermitidos.filter(h => !ocupados.includes(h));

            timeSelect.innerHTML = '';
            if (disponibles.length === 0) {
                timeSelect.innerHTML = '<option value="">No hay turnos disponibles para este día</option>';
                return;
            }

            disponibles.forEach(hora => {
                const opt = document.createElement('option');
                opt.value = hora;
                opt.textContent = hora + ' hs';
                timeSelect.appendChild(opt);
            });
        } catch (err) {
            console.error('Error al verificar horarios:', err);
            timeSelect.innerHTML = '<option value="">Error al cargar horarios</option>';
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            patientName: document.getElementById('patientName').value.trim(),
            patientPhone: document.getElementById('patientPhone').value.trim(),
            patientAge: document.getElementById('patientAge').value.trim(),
            date: dateInput.value,
            time: timeSelect.value
        };

        try {
            const res = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al agendar');

            alert('¡Turno solicitado con éxito! Quedará en estado pendiente.');
            form.reset();
            timeSelect.innerHTML = '<option value="">Seleccione una fecha primero</option>';
        } catch (err) {
            alert('Atención: ' + err.message);
        }
    });
});