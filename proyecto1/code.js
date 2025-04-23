let iniciado = false;
let nombre = null
function ingresarDatos() {
    if (iniciado == true){
        let respuesta = prompt("¿Quieres volver a ingresar? (si/no)");
        if (respuesta.toLowerCase() == "si") {
            iniciado = false; // Reiniciar la variable para permitir nuevo ingreso
            alert("Dale a 'ingresar' para volver a ingresar.");
        } else {
            alert("Gracias por usar el programa.");
        }
        return;
    }
    nombre = cambiarNombre();
    while (nombre == null || nombre == "") {
        nombre = cambiarNombre();
    }
    
    if (nombre) { // Validar que el usuario ingrese un nombre
        document.getElementById("nombre").textContent = "Bienvenido, " + nombre + "!"; 
    } else {
        alert("No ingresaste un nombre.");
    }
    let añoDeNacimiento = parseInt(prompt("¿Cuándo naciste?")); // Convertir entrada a número
    let añoActual = new Date().getFullYear();

    if (isNaN(añoDeNacimiento)) {
        alert("Por favor, ingresa un año válido."); // Validación de entrada
    } else {
        let edad = añoActual - añoDeNacimiento;
        if (edad > 130 || edad < 0) {
            alert("¿En serio tienes " + edad + " años?"); // Validación de edad
        } else {
            alert("Hola " + nombre + ", tienes " + edad + " años.");
        }
        iniciado = true;
    }
}

function cambiarNombre() {
    let nombre = prompt("¿Cuál es tu nombre?");
    
    if (nombre) { // Validar que el usuario ingrese un nombre
        document.getElementById("nombre").textContent = "Bienvenido, " + nombre + "!"; 
        return nombre;
    } else {
        alert("No ingresaste un nombre.");
        return null; // Retornar null si no se ingresa un nombre
    }
    
}
