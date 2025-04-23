const player = document.getElementById("player");
const goal = document.getElementById("goal");
const walls = document.querySelectorAll(".wall");
const gameArea = document.getElementById("game-area");

let playerPosition = { top: 10, left: 10 };
let keysPressed = {}; // Objeto para rastrear teclas presionadas
let moveInterval;

// Detectar colisión entre dos elementos
function isColliding(rect1, rect2) {
    return !(
        rect1.top > rect2.bottom ||
        rect1.bottom < rect2.top ||
        rect1.left > rect2.right ||
        rect1.right < rect2.left
    );
}

// Mover al jugador
function movePlayer(dx, dy) {
    const newTop = playerPosition.top + dy;
    const newLeft = playerPosition.left + dx;

    // Limitar movimiento dentro del área de juego
    if (newTop < 0 || newTop + player.offsetHeight > gameArea.offsetHeight) return;
    if (newLeft < 0 || newLeft + player.offsetWidth > gameArea.offsetWidth) return;

    // Simular nueva posición
    const playerRect = {
        top: newTop,
        left: newLeft,
        bottom: newTop + player.offsetHeight,
        right: newLeft + player.offsetWidth,
    };

    // Verificar colisión con paredes
    for (const wall of walls) {
        const wallRect = wall.getBoundingClientRect();
        const gameRect = gameArea.getBoundingClientRect();
        const adjustedWallRect = {
            top: wallRect.top - gameRect.top,
            left: wallRect.left - gameRect.left,
            bottom: wallRect.bottom - gameRect.top,
            right: wallRect.right - gameRect.left,
        };

        if (isColliding(playerRect, adjustedWallRect)) {
            return; // No mover si hay colisión
        }
    }

    // Actualizar posición del jugador
    playerPosition.top = newTop;
    playerPosition.left = newLeft;
    player.style.top = `${playerPosition.top}px`;
    player.style.left = `${playerPosition.left}px`;

    // Verificar si el jugador llegó al objetivo
    const goalRect = goal.getBoundingClientRect();
    const adjustedGoalRect = {
        top: goalRect.top - gameArea.getBoundingClientRect().top,
        left: goalRect.left - gameArea.getBoundingClientRect().left,
        bottom: goalRect.bottom - gameArea.getBoundingClientRect().top,
        right: goalRect.right - gameArea.getBoundingClientRect().left,
    };

    if (isColliding(playerRect, adjustedGoalRect)) {
        alert("¡Ganaste! Llegaste al objetivo.");
        location.reload();
    }
}

// Manejar teclas presionadas
document.addEventListener("keydown", (event) => {
    if (!keysPressed[event.key]) {
        keysPressed[event.key] = true;

        // Iniciar el movimiento continuo si no está ya en marcha
        if (!moveInterval) {
            moveInterval = setInterval(() => {
                if (keysPressed["ArrowUp"]) movePlayer(0, -5);
                if (keysPressed["w"]) movePlayer(0, -5);
                if (keysPressed["ArrowDown"]) movePlayer(0, 5);
                if (keysPressed["s"]) movePlayer(0, 5);
                if (keysPressed["ArrowLeft"]) movePlayer(-5, 0);
                if (keysPressed["a"]) movePlayer(-5, 0);
                if (keysPressed["ArrowRight"]) movePlayer(5, 0);
                if (keysPressed["d"]) movePlayer(5, 0);
            }, 20); // Ajusta la velocidad del movimiento cambiando este valor
        }
    }
});

document.addEventListener("keyup", (event) => {
    keysPressed[event.key] = false;

    // Detener el movimiento continuo si no hay teclas presionadas
    if (!Object.values(keysPressed).includes(true)) {
        clearInterval(moveInterval);
        moveInterval = null;
    }
});