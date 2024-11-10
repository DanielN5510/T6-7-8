document.addEventListener('DOMContentLoaded', () => {
  const fetchData = async (url, options = {}) => {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error('Error en la solicitud: ' + response.statusText);
      return await response.json();
    } catch (error) {
      console.error('Hubo un problema con la solicitud fetch:', error);
      alert(error.message); // Puedes mostrar un mensaje de error al usuario si lo deseas
    }
  };
  const renderRoomTable = (data) => {
    const tabla = document.getElementById('room-table').getElementsByTagName('tbody')[0];
    tabla.innerHTML = ''; // Vaciar la tabla antes de llenarla nuevamente
    data.forEach(habitacion => {
      const fila = tabla.insertRow();
      fila.insertCell(0).textContent = habitacion.numero;
      fila.insertCell(1).textContent = habitacion.nombre;
      fila.insertCell(2).textContent = habitacion.tipo;
      fila.insertCell(3).textContent = habitacion.precio;
      fila.insertCell(4).textContent = habitacion.fechaDisponibilidad;
      fila.insertCell(5).textContent = habitacion.reservada ? 'Reservada' : 'Disponible';
      const celdaAcciones = fila.insertCell(6);
      // Botón Reservar/Liberar
      const botonReservarLiberar = document.createElement('button');
      botonReservarLiberar.textContent = habitacion.reservada ? 'Liberar' : 'Reservar';
      botonReservarLiberar.className = habitacion.reservada ? 'btn btn-danger' : 'btn btn-success';
      botonReservarLiberar.addEventListener('click', async () => {
        const nuevoEstadoReservada = !habitacion.reservada;
        await fetchData(`http://localhost:3000/habitaciones/${habitacion.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...habitacion, reservada: nuevoEstadoReservada })
        });
        habitacion.reservada = nuevoEstadoReservada;
        botonReservarLiberar.textContent = habitacion.reservada ? 'Liberar' : 'Reservar';
        botonReservarLiberar.className = habitacion.reservada ? 'btn btn-danger' : 'btn btn-success';
        fila.cells[5].textContent = habitacion.reservada ? 'Reservada' : 'Disponible';
      });
      celdaAcciones.appendChild(botonReservarLiberar);
      // Botón Eliminar
      const botonEliminar = document.createElement('button');
      botonEliminar.textContent = 'Eliminar';
      botonEliminar.className = 'btn btn-warning';
      botonEliminar.addEventListener('click', async () => {
        await fetchData(`http://localhost:3000/habitaciones/${habitacion.id}`, { method: 'DELETE' });
        fila.remove();
      });
      celdaAcciones.appendChild(botonEliminar);
    });
  };
  const loadRooms = async () => {
    const rooms = await fetchData('http://localhost:3000/habitaciones');
    if (rooms) renderRoomTable(rooms);
  };
  // Cargar habitaciones al iniciar
  loadRooms();
  // Función para formatear el nombre de la habitación
  const formatearNombre = (nombre) => {
    return nombre.split(' ')
      .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase())
      .join(' ');
  };
  // Añadir nueva habitación
  document.getElementById('add-room-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const numero = document.getElementById('room-number').value;
    const nombre = document.getElementById('room-name').value;
    const tipo = document.getElementById('room-type').value;
    const precio = parseFloat(document.getElementById('room-price').value);
    const fechaDisponibilidad = document.getElementById('availability-date').value;
    const mensajesError = [];
    // Validaciones
    if (!/^\d{3}$/.test(numero)) mensajesError.push('El número de habitación debe tener exactamente 3 dígitos.');
    const numerosExistentes = Array.from(document.querySelectorAll('#room-table tbody tr')).map(fila => fila.cells[0].textContent);
    if (numerosExistentes.includes(numero)) mensajesError.push('El número de habitación ya existe.');
    if (!/^\w+\s\w+/.test(nombre)) mensajesError.push('El nombre de la habitación debe contener al menos dos palabras.');
    if (!['individual', 'doble', 'suite'].includes(tipo.toLowerCase())) mensajesError.push('El tipo de habitación debe ser Individual, Doble o Suite.');
    if (isNaN(precio) || precio <= 0 || !/^\d+(\.\d{1,2})?$/.test(precio)) mensajesError.push('El precio por noche debe ser un número positivo mayor que 0 y puede tener hasta dos decimales.');
    const fechaActual = new Date().toISOString().split('T')[0];
    if (fechaDisponibilidad <= fechaActual) mensajesError.push('La fecha de disponibilidad debe ser una fecha futura.');

    if (mensajesError.length > 0) {
      alert(mensajesError.join('\n'));
      return;
    }
    const nuevaHabitacion = {
      numero: numero,
      nombre: formatearNombre(nombre),
      tipo: tipo,
      precio: precio,
      reservada: false,
      fechaDisponibilidad: fechaDisponibilidad
    };
    // Enviar la nueva habitación al servidor
    await fetchData('http://localhost:3000/habitaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevaHabitacion)
    });
    loadRooms(); // Recargar la lista de habitaciones
  });
  // Contar habitaciones por estado
  document.getElementById('room-counter').addEventListener('click', async () => {
    const rooms = await fetchData('http://localhost:3000/habitaciones');
    if (rooms) {
      const reservadas = rooms.filter(habitacion => habitacion.reservada).length;
      const disponibles = rooms.length - reservadas;
      document.getElementById('report-result').innerHTML = `
        <p>Total de habitaciones reservadas: ${reservadas}</p>
        <p>Total de habitaciones disponibles: ${disponibles}</p>
      `;
    }
  });
  // Precio promedio
  document.getElementById('average-price').addEventListener('click', async () => {
    const rooms = await fetchData('http://localhost:3000/habitaciones');
    if (rooms) {
      const totalPrecio = rooms.reduce((sum, habitacion) => sum + habitacion.precio, 0);
      const precioPromedio = totalPrecio / rooms.length;
      document.getElementById('report-result').innerHTML = `
        <p>Precio promedio de habitaciones: $${precioPromedio.toFixed(2)}</p>
      `;
    }
  });
  // Precio más alto y más bajo
  document.getElementById('highest-lowest-price').addEventListener('click', async () => {
    const rooms = await fetchData('http://localhost:3000/habitaciones');
    if (rooms) {
      let habitacionMasCara = rooms[0];
      let habitacionMasBarata = rooms[0];
      rooms.forEach(habitacion => {
        if (habitacion.precio > habitacionMasCara.precio) habitacionMasCara = habitacion;
        if (habitacion.precio < habitacionMasBarata.precio) habitacionMasBarata = habitacion;
      });
      document.getElementById('report-result').innerHTML = `
        <p>Habitación más cara: ${habitacionMasCara.nombre} - $${habitacionMasCara.precio}</p>
        <p>Habitación más barata: ${habitacionMasBarata.nombre} - $${habitacionMasBarata.precio}</p>
      `;
    }
  });
  // Habitaciones disponibles por tipo
  document.getElementById('available-rooms-by-type').addEventListener('click', () => {
    fetch('http://localhost:3000/habitaciones')
        .then(response => {
            if (!response.ok) {
                throw new Error('Error en la solicitud: ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            // Filtrar solo las habitaciones disponibles
            const habitacionesDisponibles = data.filter(habitacion => !habitacion.reservada);
            // Agrupar y contar habitaciones disponibles por tipo
            const conteoPorTipo = habitacionesDisponibles.reduce((conteo, habitacion) => {
                const tipo = habitacion.tipo;
                conteo[tipo] = (conteo[tipo] || 0) + 1;
                return conteo;
            }, {});
            // Mostrar el conteo de habitaciones disponibles por tipo en el contenedor de informes
            const reportResult = document.getElementById('report-result');
            reportResult.innerHTML = `
                <p>Habitaciones disponibles por tipo:</p>
                <ul>
                    <li>Individual: ${conteoPorTipo['Individual'] || 0}</li>
                    <li>Doble: ${conteoPorTipo['Doble'] || 0}</li>
                    <li>Suite: ${conteoPorTipo['Suite'] || 0}</li>
                </ul>
            `;
        })
        .catch(error => {
            console.error('Hubo un problema con la solicitud fetch:', error);
        });
  });
  document.getElementById('available-next-7-days').addEventListener('click', () => {
    fetch('http://localhost:3000/habitaciones')
        .then(response => {
            if (!response.ok) {
                throw new Error('Error en la solicitud: ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            // Calcular la fecha límite (hoy + 7 días)
            const hoy = new Date();
            const fechaLimite = new Date();
            fechaLimite.setDate(hoy.getDate() + 7);
            // Filtrar habitaciones disponibles en los próximos 7 días
            const habitacionesProximas = data.filter(habitacion => {
                const fechaDisponibilidad = new Date(habitacion.fechaDisponibilidad);
                return !habitacion.reservada && fechaDisponibilidad <= fechaLimite && fechaDisponibilidad >= hoy;
            });
            // Mostrar la lista de habitaciones en el contenedor de informes
            const reportResult = document.getElementById('report-result');
            if (habitacionesProximas.length > 0) {
                reportResult.innerHTML = `
                    <p>Habitaciones disponibles en los próximos 7 días:</p>
                    <ul>
                        ${habitacionesProximas.map(habitacion => `
                            <li>${habitacion.nombre} - Disponible desde: ${habitacion.fechaDisponibilidad}</li>
                        `).join('')}
                    </ul>
                `;
            } else {
                reportResult.innerHTML = `<p>No hay habitaciones disponibles en los próximos 7 días.</p>`;
            }
        })
        .catch(error => {
            console.error('Hubo un problema con la solicitud fetch:', error);
        });
});
});