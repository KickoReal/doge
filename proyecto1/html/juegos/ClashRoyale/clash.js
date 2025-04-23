// Datos de las unidades y habilidades
// Agrega nuevas cartas aquí con sus propiedades
const unitsData = {
  knight: { cost: 4, color: 'blue', hp: 750, damage: 75, vision: 200, attackRange: 50, speed: 0.05, attackCooldown: 400, type: 'melee' },
  archer: { cost: 3, color: 'pink', hp: 500, damage: 50, vision: 260, attackRange: 200, speed: 0.05, attackCooldown: 500, type: 'ranged' },
  golem: { cost: 8, color: 'black', hp: 15000, damage: 1000, vision: 0, attackRange: 50, speed: 0.02, attackCooldown: 4000, type: 'melee' },
  fireball: { cost: 5, color: 'red', damage: 500, explosionRadius: 10 }
};

// Variables globales del juego
let playerElixir = 10;
let aiElixir = 10;
const maxElixir = 10;
let playerTowerHP = 20000;
let aiTowerHP = 20000;
let units = [];
let cardCooldowns = { knight: false, archer: false, golem: false, fireball: false };
let awaitingFireball = false;

// Configuración de torres
let playerTowerTarget = null;
let aiTowerTarget = null;
let towerAttackCooldown = 1000;
let playerTowerLastAttack = 0;
let aiTowerLastAttack = 0;

// Configuración de mejoras
let playerElixirSpent = 0;
let aiElixirSpent = 0;
let playerElixirUpgradeLevel = 0;
let aiElixirUpgradeLevel = 0;
const elixirCollectorUpgradeCosts = [10, 15, 20, 25, 30, 35, 40];
const baseElixirInterval = 1500;

// Elementos del DOM
const gameContainer = document.getElementById("game-container");
const playerTowerEl = document.getElementById("player-tower");
const aiTowerEl = document.getElementById("ai-tower");
const playerElixirDisplay = document.getElementById("player-elixir");

// Función para calcular la distancia entre dos puntos
function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

// Actualizar la interfaz de elixir
function updateElixirUI() {
  playerElixirDisplay.textContent = playerElixir;
}

// Configurar cooldown para una carta
function cooldownCard(cardName, ms) {
  cardCooldowns[cardName] = true;
  setTimeout(() => {
      cardCooldowns[cardName] = false;
  }, ms);
}

// Función para generar una unidad
// Puedes agregar nuevas unidades simplemente añadiendo sus datos en `unitsData`
function spawnUnit(type, owner) {
  const data = unitsData[type];
  let unit = {
      type: type,
      owner: owner,
      currentHp: data.hp,
      damage: data.damage,
      vision: data.vision,
      attackRange: data.attackRange,
      speed: data.speed,
      attackCooldown: data.attackCooldown,
      lastAttack: 0,
      target: null
  };

  // Posicionar la unidad cerca de la torre correspondiente
  if (owner === "player") {
      let towerRect = playerTowerEl.getBoundingClientRect();
      let gameRect = gameContainer.getBoundingClientRect();
      unit.x = towerRect.left - gameRect.left - 30;
      unit.y = towerRect.top - gameRect.top + 10;
  } else {
      let towerRect = aiTowerEl.getBoundingClientRect();
      let gameRect = gameContainer.getBoundingClientRect();
      unit.x = towerRect.left - gameRect.left + 30;
      unit.y = towerRect.top - gameRect.top + 10;
  }

  // Crear el elemento visual de la unidad
  let el = document.createElement("div");
  el.classList.add("unit");
  el.style.backgroundColor = data.color;
  el.style.left = `${unit.x}px`;
  el.style.top = `${unit.y}px`;
  gameContainer.appendChild(el);
  unit.element = el;
  units.push(unit);
}

// Función para lanzar una bola de fuego
function castFireball(owner, targetX, targetY) {
  const data = unitsData.fireball;
  let originEl = owner === 'player' ? playerTowerEl : aiTowerEl;
  let originRect = originEl.getBoundingClientRect();
  let gameRect = gameContainer.getBoundingClientRect();
  let startX = originRect.left - gameRect.left + originEl.offsetWidth / 2;
  let startY = originRect.top - gameRect.top + originEl.offsetHeight / 2;

  // Crear el elemento visual de la bola de fuego
  let fireballEl = document.createElement("div");
  fireballEl.classList.add("projectile");
  fireballEl.style.width = "15px";
  fireballEl.style.height = "15px";
  fireballEl.style.backgroundColor = data.color;
  fireballEl.style.borderRadius = "50%";
  fireballEl.style.position = "absolute";
  fireballEl.style.left = `${startX}px`;
  fireballEl.style.top = `${startY}px`;
  gameContainer.appendChild(fireballEl);

  // Animar la bola de fuego hacia el objetivo
  const speed = 0.5;
  let dx = targetX - startX;
  let dy = targetY - startY;
  let distTotal = Math.hypot(dx, dy);
  let normX = dx / distTotal;
  let normY = dy / distTotal;
  let traveled = 0;
  let lastTime = Date.now();

  function animateProjectile() {
      let now = Date.now();
      let delta = now - lastTime;
      lastTime = now;
      let step = speed * delta;
      traveled += step;
      let newX = startX + normX * traveled;
      let newY = startY + normY * traveled;
      fireballEl.style.left = `${newX}px`;
      fireballEl.style.top = `${newY}px`;

      if (traveled < distTotal) {
          requestAnimationFrame(animateProjectile);
      } else {
          gameContainer.removeChild(fireballEl);
          let maxExplosionRadius = 50;
          animateExplosion(targetX, targetY, maxExplosionRadius, data.damage, owner);
      }
  }
  animateProjectile();
}

// Función para animar la explosión de la bola de fuego
function animateExplosion(x, y, maxRadius, damage, owner) {
  let explosionEl = document.createElement("div");
  explosionEl.style.position = "absolute";
  explosionEl.style.backgroundColor = "red";
  explosionEl.style.borderRadius = "50%";
  explosionEl.style.width = "0px";
  explosionEl.style.height = "0px";
  explosionEl.style.left = `${x}px`;
  explosionEl.style.top = `${y}px`;
  explosionEl.style.opacity = 1;
  explosionEl.style.pointerEvents = "none";
  gameContainer.appendChild(explosionEl);

  let currentRadius = 0;
  let damagedUnits = new Set();

  function step() {
      currentRadius += 4;
      let diameter = currentRadius * 2;
      explosionEl.style.width = `${diameter}px`;
      explosionEl.style.height = `${diameter}px`;
      explosionEl.style.left = `${x - currentRadius}px`;
      explosionEl.style.top = `${y - currentRadius}px`;
      explosionEl.style.opacity = Math.max(1 - currentRadius / maxRadius, 0);

      // Daño a las unidades dentro del radio de explosión
      units.forEach(u => {
          if (u.owner !== owner && !damagedUnits.has(u)) {
              if (distance(u.x, u.y, x, y) <= currentRadius) {
                  u.currentHp -= damage;
                  damagedUnits.add(u);
              }
          }
      });

      if (currentRadius < maxRadius) {
          requestAnimationFrame(step);
      } else {
          gameContainer.removeChild(explosionEl);
      }
  }
  requestAnimationFrame(step);
}

// Continúa con las demás funciones del juego...
  function fireCannonball(owner, targetUnit) {
    let towerEl = owner === "player" ? playerTowerEl : aiTowerEl;
    let start = getTowerCenter(towerEl);
    let target = { x: targetUnit.x + 10, y: targetUnit.y + 10 };
    let cannonball = document.createElement("div");
    cannonball.classList.add("projectile");
    cannonball.style.backgroundColor = "gray";
    cannonball.style.width = "12px";
    cannonball.style.height = "12px";
    cannonball.style.borderRadius = "50%";
    cannonball.style.position = "absolute";
    cannonball.style.left = `${start.x - 6}px`;
    cannonball.style.top = `${start.y - 6}px`;
    gameContainer.appendChild(cannonball);
    let dx = target.x - start.x;
    let dy = target.y - start.y;
    let totalDistance = Math.hypot(dx, dy);
    let normX = dx / totalDistance;
    let normY = dy / totalDistance;
    let traveled = 0;
    let speed = 0.4;
    let lastTime = Date.now();
    function animateCannonball() {
      let now = Date.now();
      let delta = now - lastTime;
      lastTime = now;
      traveled += speed * delta;
      let currentX = start.x + normX * traveled;
      let currentY = start.y + normY * traveled;
      cannonball.style.left = `${currentX - 6}px`;
      cannonball.style.top = `${currentY - 6}px`;
      if (traveled >= totalDistance || distance(currentX, currentY, target.x, target.y) <= 5) {
        targetUnit.currentHp -= 100;
        if (cannonball.parentNode === gameContainer) {
          gameContainer.removeChild(cannonball);
        }
      } else {
        requestAnimationFrame(animateCannonball);
      }
    }
    requestAnimationFrame(animateCannonball);
  }
  
  function fireArrow(shooter, targetUnit) {
    let startX = shooter.x + 10;
    let startY = shooter.y + 10;
    let targetX = targetUnit.x + 10;
    let targetY = targetUnit.y + 10;
    let arrowEl = document.createElement("div");
    arrowEl.classList.add("projectile");
    arrowEl.style.backgroundColor = "brown";
    arrowEl.style.width = "8px";
    arrowEl.style.height = "8px";
    arrowEl.style.borderRadius = "50%";
    arrowEl.style.position = "absolute";
    arrowEl.style.left = `${startX - 4}px`;
    arrowEl.style.top = `${startY - 4}px`;
    gameContainer.appendChild(arrowEl);
    let speed = 0.6;
    let dx = targetX - startX;
    let dy = targetY - startY;
    let totalDistance = Math.hypot(dx, dy);
    let normX = dx / totalDistance;
    let normY = dy / totalDistance;
    let traveled = 0;
    let lastTime = Date.now();
    function animateArrow() {
      let now = Date.now();
      let delta = now - lastTime;
      lastTime = now;
      traveled += speed * delta;
      let currentX = startX + normX * traveled;
      let currentY = startY + normY * traveled;
      arrowEl.style.left = `${currentX - 4}px`;
      arrowEl.style.top = `${currentY - 4}px`;
      if (traveled >= totalDistance || distance(currentX, currentY, targetX, targetY) <= 5) {
        targetUnit.currentHp -= shooter.damage;
        if (arrowEl.parentNode === gameContainer) {
          gameContainer.removeChild(arrowEl);
        }
      } else {
        requestAnimationFrame(animateArrow);
      }
    }
    requestAnimationFrame(animateArrow);
  }
  
  function getTowerCenter(towerEl) {
    let rect = towerEl.getBoundingClientRect();
    let gameRect = gameContainer.getBoundingClientRect();
    return { x: rect.left - gameRect.left + towerEl.offsetWidth / 2, y: rect.top - gameRect.top + towerEl.offsetHeight / 2 };
  }
  
  function updateUnits(delta) {
    let now = Date.now();
    for (let i = units.length - 1; i >= 0; i--) {
      let unit = units[i];
      if (unit.target && unit.target.type !== "tower") {
        if (unit.target.currentHp <= 0 || distance(unit.x, unit.y, unit.target.x, unit.target.y) > unit.vision) {
          unit.target = null;
        }
      }
      if (!unit.target || (unit.target.type === "tower" && distance(unit.x, unit.y, unit.target.x, unit.target.y) > unit.attackRange)) {
        for (let j = 0; j < units.length; j++) {
          let enemy = units[j];
          if (enemy.owner !== unit.owner && enemy.currentHp > 0) {
            if (distance(unit.x, unit.y, enemy.x, enemy.y) <= unit.vision) {
              unit.target = enemy;
              break;
            }
          }
        }
        if (!unit.target) {
          unit.target = {
            type: "tower",
            owner: unit.owner === "player" ? "enemy" : "player",
            x: unit.owner === "player" ? getTowerCenter(aiTowerEl).x : getTowerCenter(playerTowerEl).x,
            y: unit.owner === "player" ? getTowerCenter(aiTowerEl).y : getTowerCenter(playerTowerEl).y,
            currentHp: unit.owner === "player" ? aiTowerHP : playerTowerHP
          };
        }
      }
      let targetX = unit.target.x;
      let targetY = unit.target.y;
      let dist = distance(unit.x, unit.y, targetX, targetY);
      if (dist > unit.attackRange) {
        let dx = targetX - unit.x;
        let dy = targetY - unit.y;
        let norm = Math.hypot(dx, dy);
        unit.x += (dx / norm) * unit.speed * delta;
        unit.y += (dy / norm) * unit.speed * delta;
      } else {
        if (now - unit.lastAttack >= unit.attackCooldown) {
          unit.lastAttack = now;
          if (unit.type === "archer") {
            if (unit.target) {
              fireArrow(unit, unit.target);
            }
          } else if (unit.target.type !== "tower") {
            unit.target.currentHp -= unit.damage;
          } else {
            if (unit.owner === "player") {
              aiTowerHP -= unit.damage;
            } else {
              playerTowerHP -= unit.damage;
            }
          }
        }
      }
      if (unit.element) {
        unit.element.style.left = `${unit.x}px`;
        unit.element.style.top = `${unit.y}px`;
      }
      if (unit.currentHp <= 0) {
        if (unit.element && unit.element.parentNode === gameContainer) {
          gameContainer.removeChild(unit.element);
        }
        units.splice(i, 1);
        continue;
      }
    }
  }
  
  function aiActions(now) {
    if (now % 2000 < 30) {
      let possibleCards = [];
      if (aiElixir >= unitsData.knight.cost) possibleCards.push("knight");
      if (aiElixir >= unitsData.archer.cost) possibleCards.push("archer");
      if (aiElixir >= unitsData.golem.cost) possibleCards.push("golem");
      if (aiElixir >= unitsData.fireball.cost) possibleCards.push("fireball");
      if (possibleCards.length > 0) {
        let choice = possibleCards[Math.floor(Math.random() * possibleCards.length)];
        if (choice === "fireball") {
          aiElixir -= unitsData.fireball.cost;
          aiElixirSpent += unitsData.fireball.cost;
          let towerCenter = getTowerCenter(playerTowerEl);
          castFireball("enemy", towerCenter.x, towerCenter.y);
        } else {
          spawnUnit(choice, "enemy");
          aiElixir -= unitsData[choice].cost;
          aiElixirSpent += unitsData[choice].cost;
        }
        updateAIElixirSpentUI();
      }
    }
  }
  
  function generatePlayerElixir() {
    if (playerElixir < maxElixir) {
      playerElixir++;
      updateElixirUI();
    }
    let delay = baseElixirInterval - (playerElixirUpgradeLevel * 200);
    setTimeout(generatePlayerElixir, delay);
  }
  
  function generateAIElixir() {
    if (aiElixir < maxElixir) {
      aiElixir++;
    }
    let delay = baseElixirInterval - (aiElixirUpgradeLevel * 200);
    setTimeout(generateAIElixir, delay);
  }
  
  function updatePlayerElixirSpentUI() {
    document.getElementById("player-elixir-spent").textContent = playerElixirSpent;
  }
  
  function updateAIElixirSpentUI() {
    document.getElementById("ai-elixir-spent").textContent = aiElixirSpent;
  }
  
  function updateUpgradeUI() {
    document.getElementById("upgrade-elixir-collector-level").textContent = "Nivel: " + playerElixirUpgradeLevel;
    if (playerElixirUpgradeLevel < 7) {
      document.getElementById("upgrade-elixir-collector-cost").textContent = "Costo: " + elixirCollectorUpgradeCosts[playerElixirUpgradeLevel];
    } else {
      document.getElementById("upgrade-elixir-collector-cost").textContent = "Máximo alcanzado";
    }
  }
  
  document.getElementById("upgrade-elixir-collector").addEventListener("click", () => {
if (playerElixirUpgradeLevel >= 7) return;
let cost = elixirCollectorUpgradeCosts[playerElixirUpgradeLevel];
if (playerElixirSpent >= cost) {
  playerElixirSpent -= cost;
  playerElixirUpgradeLevel++;
  updatePlayerElixirSpentUI();
  updateUpgradeUI();
} else {
  alert("No tienes suficiente elixir gastado para comprar la mejora.");
}

  });
  
  document.getElementById("knight-btn").addEventListener("click", () => {
    if (!cardCooldowns.knight && playerElixir >= unitsData.knight.cost) {
      spawnUnit("knight", "player");
      playerElixir -= unitsData.knight.cost;
      playerElixirSpent += unitsData.knight.cost;
      updateElixirUI();
      updatePlayerElixirSpentUI();
      cooldownCard("knight", 500);
    }
  });
  
  document.getElementById("archer-btn").addEventListener("click", () => {
    if (!cardCooldowns.archer && playerElixir >= unitsData.archer.cost) {
      spawnUnit("archer", "player");
      playerElixir -= unitsData.archer.cost;
      playerElixirSpent += unitsData.archer.cost;
      updateElixirUI();
      updatePlayerElixirSpentUI();
      cooldownCard("archer", 500);
    }
  });
  
  document.getElementById("golem-btn").addEventListener("click", () => {
    if (!cardCooldowns.golem && playerElixir >= unitsData.golem.cost) {
      spawnUnit("golem", "player");
      playerElixir -= unitsData.golem.cost;
      playerElixirSpent += unitsData.golem.cost;
      updateElixirUI();
      updatePlayerElixirSpentUI();
      cooldownCard("golem", 3000);
    }
  });
  
  document.getElementById("fireball-btn").addEventListener("click", () => {
    if (!cardCooldowns.fireball && playerElixir >= unitsData.fireball.cost) {
      playerElixir -= unitsData.fireball.cost;
      playerElixirSpent += unitsData.fireball.cost;
      updateElixirUI();
      updatePlayerElixirSpentUI();
      cooldownCard("fireball", 1000);
      awaitingFireball = true;
    }
  });
  
  gameContainer.addEventListener("click", (evt) => {
    if (awaitingFireball) {
      let rect = gameContainer.getBoundingClientRect();
      let targetX = evt.clientX - rect.left;
      let targetY = evt.clientY - rect.top;
      castFireball("player", targetX, targetY);
      awaitingFireball = false;
    }
  });
  
  function aiTryBuyElixirCollector() {
    if (aiElixirUpgradeLevel < 7) {
      let cost = elixirCollectorUpgradeCosts[aiElixirUpgradeLevel];
      if (aiElixirSpent >= cost) {
        setTimeout(() => {
          if (aiElixirUpgradeLevel < 7 && aiElixirSpent >= cost) {
            aiElixirSpent -= cost;
            aiElixirUpgradeLevel++;
            updateAIElixirSpentUI();
          }
        }, 1000);
      }
    }
  }
  
  function updateTowerAttacks(now) {
    if (playerTowerTarget && playerTowerTarget.currentHp <= 0) {
      playerTowerTarget = null;
    }
    if (!playerTowerTarget) {
      let center = getTowerCenter(playerTowerEl);
      units.forEach(u => {
        if (u.owner === "enemy" && u.currentHp > 0) {
          let unitCenterX = u.x + 10;
          let unitCenterY = u.y + 10;
          if (distance(center.x, center.y, unitCenterX, unitCenterY) <= 12) {
            playerTowerTarget = u;
          }
        }
      });
    }
    if (playerTowerTarget && now - playerTowerLastAttack >= towerAttackCooldown) {
      playerTowerLastAttack = now;
      fireCannonball("player", playerTowerTarget);
    }
    if (aiTowerTarget && aiTowerTarget.currentHp <= 0) {
      aiTowerTarget = null;
    }
    if (!aiTowerTarget) {
      let center = getTowerCenter(aiTowerEl);
      units.forEach(u => {
        if (u.owner === "player" && u.currentHp > 0) {
          let unitCenterX = u.x + 10;
          let unitCenterY = u.y + 10;
          if (distance(center.x, center.y, unitCenterX, unitCenterY) <= 12) {
            aiTowerTarget = u;
          }
        }
      });
    }
    if (aiTowerTarget && now - aiTowerLastAttack >= towerAttackCooldown) {
      aiTowerLastAttack = now;
      fireCannonball("enemy", aiTowerTarget);
    }
  }
  
  let lastTime = Date.now();
  function gameLoop() {
    let now = Date.now();
    let delta = now - lastTime;
    lastTime = now;
    updateUnits(delta);
    aiActions(now);
    updateTowerAttacks(now);
    aiTryBuyElixirCollector();
    requestAnimationFrame(gameLoop);
  }
  requestAnimationFrame(gameLoop);
  generatePlayerElixir();
  generateAIElixir();


  let interval = setInterval(() => {
    aiTowerEl.querySelector("#ai-tower-health").textContent = aiTowerHP;
    playerTowerEl.querySelector("#player-tower-health").textContent = playerTowerHP;
    if (aiTowerHP <= 0 || playerTowerHP <= 0) {
      clearInterval(interval);
      alert("Game Over!");
      // como puedo hacer para que luego de esto se reinicie la página automáticamente?
      location.reload(); // Recarga la página para reiniciar el juego
    }
  }, 500);