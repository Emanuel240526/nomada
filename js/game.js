/* =========================================================
   NÓMADA
   GAME.JS
   Arcade espacial retro / pixel art
   ========================================================= */

(() => {
    "use strict";

    /* =====================================================
       CANVAS
       ===================================================== */

    const canvas = document.getElementById("game");
    const ctx = canvas.getContext("2d");

    let WIDTH = 900;
    let HEIGHT = 560;


    /*
     * Detección real de dispositivo táctil (no solo ancho
     * de pantalla). Un teléfono en horizontal puede superar
     * los 700px de ancho y antes se quedaba sin botones.
     */

    const isTouchDevice =
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0;


    /*
     * En móvil, 100vh no siempre coincide con el alto visible
     * real (la barra de direcciones del navegador aparece y
     * desaparece). Si el contenedor #app queda más alto que la
     * pantalla visible, los botones de FIRE/MISIL/ESCUDO
     * (anclados al borde inferior) pueden terminar fuera de la
     * zona visible aunque el canvas se vea bien. Guardamos el
     * alto real en una variable CSS que style.css usa como
     * respaldo antes de dvh.
     */

    function setAppViewportHeight() {

        document.documentElement.style.setProperty(
            "--app-vh",
            (window.innerHeight * 0.01) + "px"
        );
    }

    setAppViewportHeight();


    /*
     * Limitamos la resolución interna del canvas al pixel
     * ratio del dispositivo (con techo en 2x) para que se
     * vea nítido en pantallas retina/Android de alta densidad
     * sin gastar de más en teléfonos muy potentes.
     */

    const MAX_DEVICE_PIXEL_RATIO = 2;

    function applyCanvasResolution() {

        const ratio =
            Math.min(
                window.devicePixelRatio || 1,
                MAX_DEVICE_PIXEL_RATIO
            );

        canvas.width =
            WIDTH * ratio;

        canvas.height =
            HEIGHT * ratio;

        ctx.setTransform(
            ratio,
            0,
            0,
            ratio,
            0,
            0
        );
    }


    function setCanvasOrientation(
        portrait
    ) {

        const newWidth =
            portrait ? 560 : 900;

        const newHeight =
            portrait ? 900 : 560;


        canvas.classList.toggle(
            "portrait",
            portrait
        );


        if (
            WIDTH === newWidth &&
            HEIGHT === newHeight
        ) {

            return;
        }


        WIDTH = newWidth;

        HEIGHT = newHeight;

        applyCanvasResolution();


        createStars();


        player.x =
            clamp(
                player.x,
                50,
                WIDTH - 50
            );

        player.y =
            clamp(
                player.y,
                55,
                HEIGHT - 55
            );
    }

    /* =====================================================
       PANTALLAS HTML
       ===================================================== */

    const selectScreen =
        document.getElementById("select-screen");

    const storyScreen =
        document.getElementById("story-screen");

    const storyContinueButton =
        document.getElementById("story-continue-button");

    const tutorialScreen =
        document.getElementById("tutorial-screen");

    const gameoverScreen =
        document.getElementById("gameover-screen");

    const gameoverSubtitle =
        document.getElementById("gameover-subtitle");

    const hud =
        document.getElementById("hud");

    const scoreElement =
        document.getElementById("score");

    const bestElement =
        document.getElementById("best");

    const finalScoreElement =
        document.getElementById("final-score");

    const startButton =
        document.getElementById("start-button");

    const skipTutorialButton =
        document.getElementById("skip-tutorial");

    const retryButton =
        document.getElementById("retry-button");

    const changeShipButton =
        document.getElementById("change-ship-button");

    const fireButton =
        document.getElementById("fire-button");

    const missileButton =
        document.getElementById("missile-button");

    const shieldButton =
        document.getElementById("shield-button");

    const controlsHint =
        document.getElementById("controls-hint");

    const tutorialIcon =
        document.getElementById("tutorial-icon");

    const tutorialTitle =
        document.getElementById("tutorial-title");

    const tutorialText =
        document.getElementById("tutorial-text");

    const tutorialProgress =
        document.getElementById(
            "tutorial-progress-fill"
        );

    const shipCards =
        document.querySelectorAll(".ship-card");


    /* =====================================================
       TEXTO DE CONTROLES SEGÚN DISPOSITIVO
       (táctil: deslizar + botones · escritorio: teclado)
       ===================================================== */

    function setControlsHintText(
        combat
    ) {

        if (isTouchDevice) {

            controlsHint.innerHTML =
                combat
                    ? "DESLIZA: MOVER · BOTONES: DISPARAR / ESCUDO / MISIL"
                    : "DESLIZA: MOVER · BOTONES: DISPARAR / MISIL";

        } else {

            controlsHint.innerHTML =
                combat
                    ? "↑↓←→ / WASD: MOVER · ESPACIO: DISPARAR · MAYÚS: ESCUDO · Q: MISIL"
                    : "↑ ↓ / W S: MOVER · ESPACIO: DISPARAR · Q: MISIL";
        }
    }


    /* =====================================================
       IMÁGENES DE LAS NAVES
       ===================================================== */

    const shipImages = [
        new Image(),
        new Image()
    ];

    shipImages[0].src =
        "imagenes/nave_interceptor.png";

    shipImages[1].src =
        "imagenes/nave_vanguardia.png";


    /* =====================================================
       IMÁGENES DE MISILES
       (una por nave, mismo orden que shipImages)
       ===================================================== */

    const missileImages = [
        new Image(),
        new Image()
    ];

    missileImages[0].src =
        "imagenes/misil_interceptor.png";

    missileImages[1].src =
        "imagenes/misil_vanguardia.png";


    /* =====================================================
       IMÁGENES DE METEORITOS
       ===================================================== */

    const meteorImages = [
        new Image(),
        new Image()
    ];

    meteorImages[0].src =
        "imagenes/meteoro_1.png";

    meteorImages[1].src =
        "imagenes/meteoro_2.png";


    /* =====================================================
       IMÁGENES DE ENEMIGOS
       ===================================================== */

    const enemyImages = [
        new Image(),
        new Image()
    ];

    enemyImages[0].src =
        "imagenes/enemigo_1.png";

    enemyImages[1].src =
        "imagenes/enemigo_2.png";


    /* =====================================================
       JEFES DE NIVEL
       ===================================================== */

    const BOSS_DATA = [
        {
            name: "CAZADOR AZUL",
            image: enemyImages[1],
            maxHealth: 42,
            color: "#3aa0ff"
        },
        {
            name: "CAZADOR VIOLETA",
            image: enemyImages[0],
            maxHealth: 60,
            color: "#b06bff"
        }
    ];

    const LEVEL_THRESHOLDS = [500, 1300];

    let level = 1;
    let combatMode = false;
    let boss = null;
    let bossBullets = [];
    let shieldEnergy = 100;
    let combatBannerTimer = 0;
    let combatBannerText = "";
    let combatBannerColor = "#ff4264";


    /* =====================================================
       ESTADOS
       ===================================================== */

    const STATE = {
        SELECT: "select",
        TUTORIAL: "tutorial",
        PLAYING: "playing",
        GAMEOVER: "gameover"
    };

    let gameState = STATE.SELECT;

    let selectedShip = 0;

    let score = 0;

    function readBestScore() {

        try {

            return (
                Number(
                    localStorage.getItem(
                        "nomada_best"
                    )
                ) || 0
            );

        } catch (error) {

            /*
             * Algunos navegadores (modo
             * privado en iOS/Safari, etc.)
             * bloquean localStorage. El
             * juego debe seguir funcionando
             * sin guardar récord.
             */

            return 0;
        }
    }


    function saveBestScore(
        value
    ) {

        try {

            localStorage.setItem(
                "nomada_best",
                value
            );

        } catch (error) {

            /* Sin almacenamiento disponible: se ignora. */
        }
    }


    let bestScore =
        readBestScore();

    let gameTime = 0;

    let lastTime = 0;

    let paused = false;


    /* =====================================================
       TEMPORIZADORES
       ===================================================== */

    let enemyTimer = 0;
    let meteorTimer = 0;
    let powerUpTimer = 0;
    let difficultyTimer = 0;


    /* =====================================================
       DIFICULTAD
       ===================================================== */

    let enemySpawnRate = 1.35;

    let meteorSpawnRate = 2.2;

    let worldSpeed = 150;


    /* =====================================================
       INPUT
       ===================================================== */

    const keys = {
        up: false,
        down: false,
        left: false,
        right: false,
        shield: false,
        fire: false,
        missile: false
    };


    /* =====================================================
       JUGADOR
       ===================================================== */

    const player = {

        x: 105,

        y: HEIGHT / 2,

        width: 80,

        height: 60,

        speed: 330,

        lives: 3,

        invulnerable: 0,

        fireCooldown: 0,

        weaponLevel: 1,

        rapidFireTimer: 0,

        thrustAnimation: 0,

        shielding: false,

        missileCooldown: 0
    };


    /* =====================================================
       ARRAYS DEL JUEGO
       ===================================================== */

    let bullets = [];

    let enemies = [];

    let meteors = [];

    let powerUps = [];

    let particles = [];

    let stars = [];


    /* =====================================================
       NAVES
       ===================================================== */

    const ships = [

        {
            name: "INTERCEPTOR",

            speed: 350,

            fireRate: 0.24,

            damage: 1,

            bulletSpeed: 650,

            lives: 3,

            weapon: "double"
        },

        {
            name: "VANGUARDIA",

            speed: 305,

            fireRate: 0.14,

            damage: 1,

            bulletSpeed: 720,

            lives: 3,

            weapon: "triple"
        }

    ];


    /* =====================================================
       TIPOS DE ENEMIGOS
       ===================================================== */

    const enemyTypes = [

        {
            type: "basic",

            width: 56,

            height: 56,

            speed: 150,

            health: 2,

            score: 10,

            color: "#3aa0ff",

            imageIndex: 1
        },

        {
            type: "fast",

            width: 44,

            height: 44,

            speed: 250,

            health: 1,

            score: 20,

            color: "#3aa0ff",

            imageIndex: 1
        },

        {
            type: "tank",

            width: 78,

            height: 78,

            speed: 90,

            health: 6,

            score: 50,

            color: "#b06bff",

            imageIndex: 0
        }

    ];


    /* =====================================================
       POWER UPS
       ===================================================== */

    const powerUpTypes = {

        rapid: {
            color: "#00d9ff",
            symbol: "R"
        },

        life: {
            color: "#ff4264",
            symbol: "+"
        },

        weapon: {
            color: "#ffd43b",
            symbol: "W"
        }

    };


    /* =====================================================
       AUDIO
       ===================================================== */

    let audioContext = null;


    function initAudio() {

        if (!audioContext) {

            const AudioContext =
                window.AudioContext ||
                window.webkitAudioContext;

            if (AudioContext) {

                audioContext =
                    new AudioContext();
            }
        }

        if (
            audioContext &&
            audioContext.state ===
                "suspended"
        ) {

            audioContext.resume();
        }
    }


    function sound(
        frequency,
        duration = 0.06,
        type = "square",
        volume = 0.03
    ) {

        if (!audioContext) {
            return;
        }

        try {

            const oscillator =
                audioContext.createOscillator();

            const gain =
                audioContext.createGain();

            oscillator.type = type;

            oscillator.frequency.setValueAtTime(
                frequency,
                audioContext.currentTime
            );

            gain.gain.setValueAtTime(
                volume,
                audioContext.currentTime
            );

            gain.gain.exponentialRampToValueAtTime(
                0.001,
                audioContext.currentTime +
                    duration
            );

            oscillator.connect(gain);

            gain.connect(
                audioContext.destination
            );

            oscillator.start();

            oscillator.stop(
                audioContext.currentTime +
                    duration
            );

        } catch (error) {
            // El juego continúa sin audio.
        }
    }


    function shootSound() {

        sound(
            620,
            0.045,
            "square",
            0.025
        );
    }


    function hitSound() {

        sound(
            120,
            0.09,
            "sawtooth",
            0.035
        );
    }


    function explosionSound() {

        sound(
            80,
            0.15,
            "sawtooth",
            0.045
        );
    }


    function powerSound() {

        sound(
            800,
            0.07,
            "triangle",
            0.035
        );

        setTimeout(() => {

            sound(
                1100,
                0.08,
                "triangle",
                0.03
            );

        }, 60);
    }


    /* =====================================================
       CALIDAD ADAPTATIVA
       Si el dispositivo no logra sostener un buen framerate
       (celulares de gama baja) se bajan automáticamente los
       brillos (shadowBlur, el efecto más caro en Canvas2D) y
       la cantidad de partículas. En equipos que sí aguantan,
       esto nunca se activa y el juego se ve exactamente igual.

       En táctil el umbral es más estricto y la ventana de
       detección más corta: shadowBlur casi no tiene aceleración
       por GPU en navegadores móviles, así que un celular medio
       lo nota mucho más rápido que un PC. Antes tardaba 3s en
       reaccionar (se sentía lento desde el primer segundo); ahora
       en celular baja la calidad en ~1.2s si hace falta.
       ===================================================== */

    const LOW_POWER_FPS_THRESHOLD =
        isTouchDevice
            ? 1 / 40
            : 1 / 30;

    const LOW_POWER_TRIGGER_SECONDS =
        isTouchDevice
            ? 1.2
            : 3;

    let lowPowerMode = false;
    let slowFrameAccum = 0;

    function trackPerformance(rawDt) {

        if (lowPowerMode) {
            return;
        }

        if (rawDt > LOW_POWER_FPS_THRESHOLD) {

            slowFrameAccum += rawDt;

            if (
                slowFrameAccum >
                LOW_POWER_TRIGGER_SECONDS
            ) {

                lowPowerMode = true;
            }

        } else {

            slowFrameAccum = 0;
        }
    }

    function glowBlur(px) {

        return lowPowerMode ? 0 : px;
    }


    /* =====================================================
       UTILIDADES
       ===================================================== */

    function random(min, max) {

        return (
            Math.random() *
            (max - min) +
            min
        );
    }


    function clamp(
        value,
        min,
        max
    ) {

        return Math.max(
            min,
            Math.min(
                max,
                value
            )
        );
    }


    function rectsCollide(a, b) {

        return (

            a.x <
                b.x + b.width &&

            a.x + a.width >
                b.x &&

            a.y <
                b.y + b.height &&

            a.y + a.height >
                b.y
        );
    }


    /* =====================================================
       ESTRELLAS
       ===================================================== */

    function createStars() {

        stars = [];

        const starCount =
            isTouchDevice
                ? 90
                : 140;

        for (
            let i = 0;
            i < starCount;
            i++
        ) {

            stars.push({

                x:
                    Math.random() *
                    WIDTH,

                y:
                    Math.random() *
                    HEIGHT,

                size:
                    random(
                        0.5,
                        2.2
                    ),

                speed:
                    random(
                        20,
                        90
                    ),

                alpha:
                    random(
                        0.2,
                        0.9
                    )

            });
        }
    }


    function updateStars(dt) {

        for (
            const star of stars
        ) {

            star.x -=
                (
                    star.speed +
                    worldSpeed * 0.15
                ) * dt;

            if (
                star.x < -5
            ) {

                star.x =
                    WIDTH + 5;

                star.y =
                    Math.random() *
                    HEIGHT;
            }
        }
    }


    function drawStars() {

        for (
            const star of stars
        ) {

            ctx.globalAlpha =
                star.alpha;

            ctx.fillStyle =
                "#ffffff";

            ctx.fillRect(
                star.x,
                star.y,
                star.size,
                star.size
            );
        }

        ctx.globalAlpha = 1;
    }


    /* =====================================================
       FONDO
       ===================================================== */

    /*
     * Los 3 degradados del fondo son costosos de crear y antes
     * se generaban de nuevo en CADA frame aunque no cambiaran:
     * eso es trabajo de más, sobre todo en celulares. Ahora se
     * guardan en caché y solo se recalculan si cambia el tamaño
     * del canvas (por ejemplo al entrar en modo combate vertical).
     * De paso, las nebulosas pasan a posicionarse en proporción
     * a WIDTH/HEIGHT en vez de coordenadas fijas pensadas solo
     * para el formato horizontal, así también se ven bien en
     * modo retrato.
     */

    let backgroundCacheW = 0;
    let backgroundCacheH = 0;
    let backgroundGradient = null;
    let backgroundBlueGlow = null;
    let backgroundRedGlow = null;

    function buildBackgroundGradients() {

        backgroundGradient =
            ctx.createLinearGradient(
                0,
                0,
                0,
                HEIGHT
            );

        backgroundGradient.addColorStop(
            0,
            "#03030b"
        );

        backgroundGradient.addColorStop(
            0.5,
            "#080b1e"
        );

        backgroundGradient.addColorStop(
            1,
            "#03030b"
        );


        /* Nebulosa azul */

        const blueRadius =
            Math.max(WIDTH, HEIGHT) * 0.32;

        backgroundBlueGlow =
            ctx.createRadialGradient(
                WIDTH * 0.78,
                HEIGHT * 0.18,
                0,
                WIDTH * 0.78,
                HEIGHT * 0.18,
                blueRadius
            );

        backgroundBlueGlow.addColorStop(
            0,
            "rgba(0,160,255,0.12)"
        );

        backgroundBlueGlow.addColorStop(
            1,
            "rgba(0,0,0,0)"
        );


        /* Nebulosa roja */

        const redRadius =
            Math.max(WIDTH, HEIGHT) * 0.29;

        backgroundRedGlow =
            ctx.createRadialGradient(
                WIDTH * 0.28,
                HEIGHT * 0.84,
                0,
                WIDTH * 0.28,
                HEIGHT * 0.84,
                redRadius
            );

        backgroundRedGlow.addColorStop(
            0,
            "rgba(255,0,70,0.08)"
        );

        backgroundRedGlow.addColorStop(
            1,
            "rgba(0,0,0,0)"
        );


        backgroundCacheW = WIDTH;
        backgroundCacheH = HEIGHT;
    }


    function drawBackground() {

        if (
            backgroundCacheW !== WIDTH ||
            backgroundCacheH !== HEIGHT ||
            !backgroundGradient
        ) {

            buildBackgroundGradients();
        }


        ctx.fillStyle =
            backgroundGradient;

        ctx.fillRect(
            0,
            0,
            WIDTH,
            HEIGHT
        );


        ctx.fillStyle =
            backgroundBlueGlow;

        ctx.fillRect(
            0,
            0,
            WIDTH,
            HEIGHT
        );


        ctx.fillStyle =
            backgroundRedGlow;

        ctx.fillRect(
            0,
            0,
            WIDTH,
            HEIGHT
        );


        drawStars();
    }


    /* =====================================================
       PARTÍCULAS
       ===================================================== */

    function createExplosion(
        x,
        y,
        amount = 18,
        color = "#00d9ff"
    ) {

        const finalAmount =
            lowPowerMode
                ? Math.ceil(amount * 0.4)
                : amount;

        for (
            let i = 0;
            i < finalAmount;
            i++
        ) {

            const angle =
                Math.random() *
                Math.PI *
                2;

            const speed =
                random(
                    60,
                    260
                );

            const life =
                random(
                    0.3,
                    0.75
                );

            particles.push({

                x,
                y,

                vx:
                    Math.cos(angle) *
                    speed,

                vy:
                    Math.sin(angle) *
                    speed,

                life,

                maxLife:
                    life,

                size:
                    random(
                        1.5,
                        4
                    ),

                color
            });
        }
    }


    function createThrustParticle() {

        particles.push({

            x:
                player.x - 35,

            y:
                player.y +
                random(
                    -18,
                    18
                ),

            vx:
                random(
                    -180,
                    -80
                ),

            vy:
                random(
                    -35,
                    35
                ),

            life: 0.25,

            maxLife: 0.25,

            size:
                random(
                    2,
                    5
                ),

            color:
                Math.random() >
                0.5
                    ? "#00d9ff"
                    : "#ffb000"

        });
    }


    function updateParticles(dt) {

        for (
            let i =
                particles.length - 1;
            i >= 0;
            i--
        ) {

            const p =
                particles[i];

            p.x +=
                p.vx * dt;

            p.y +=
                p.vy * dt;

            p.vx *=
                0.985;

            p.vy *=
                0.985;

            p.life -= dt;

            if (
                p.life <= 0
            ) {

                particles.splice(
                    i,
                    1
                );
            }
        }
    }


    function drawParticles() {

        for (
            const p of particles
        ) {

            ctx.globalAlpha =
                p.life /
                p.maxLife;

            ctx.fillStyle =
                p.color;

            ctx.fillRect(
                p.x,
                p.y,
                p.size,
                p.size
            );
        }

        ctx.globalAlpha = 1;
    }


    /* =====================================================
       JUGADOR
       ===================================================== */

    function resetPlayer() {

        const ship =
            ships[selectedShip];

        player.x = 105;

        player.y =
            HEIGHT / 2;

        player.speed =
            ship.speed;

        player.lives =
            ship.lives;

        player.invulnerable =
            0;

        player.fireCooldown =
            0;

        player.weaponLevel =
            1;

        player.rapidFireTimer =
            0;

        player.thrustAnimation =
            0;

        player.shielding =
            false;

        player.missileCooldown =
            0;

        level = 1;

        combatMode = false;

        boss = null;

        bossBullets = [];

        shieldEnergy = 100;

        combatBannerTimer = 0;

        setCanvasOrientation(
            false
        );
    }


    function updatePlayer(dt) {

        let movement = 0;

        if (keys.up) {
            movement--;
        }

        if (keys.down) {
            movement++;
        }

        player.y +=
            movement *
            player.speed *
            dt;

        if (combatMode) {

            player.y =
                clamp(
                    player.y,
                    HEIGHT * 0.58,
                    HEIGHT - 70
                );

        } else {

            player.y =
                clamp(
                    player.y,
                    55,
                    HEIGHT - 55
                );
        }


        if (combatMode) {

            let sideways = 0;

            if (keys.left) {
                sideways--;
            }

            if (keys.right) {
                sideways++;
            }

            player.x +=
                sideways *
                player.speed *
                dt;

            player.x =
                clamp(
                    player.x,
                    50,
                    WIDTH - 50
                );


            if (
                keys.shield &&
                shieldEnergy > 0
            ) {

                player.shielding =
                    true;

                shieldEnergy =
                    Math.max(
                        0,
                        shieldEnergy -
                            dt * 45
                    );

            } else {

                player.shielding =
                    false;

                shieldEnergy =
                    Math.min(
                        100,
                        shieldEnergy +
                            dt * 18
                    );
            }

        } else {

            player.shielding =
                false;

            shieldEnergy =
                Math.min(
                    100,
                    shieldEnergy +
                        dt * 18
                );

            if (
                player.x !==
                105
            ) {

                player.x +=
                    (105 - player.x) *
                    Math.min(
                        1,
                        dt * 4
                    );

                if (
                    Math.abs(
                        player.x - 105
                    ) < 0.5
                ) {

                    player.x = 105;
                }
            }
        }


        if (
            player.missileCooldown >
            0
        ) {

            player.missileCooldown -=
                dt;
        }

        if (
            keys.missile &&
            player.missileCooldown <=
                0
        ) {

            fireMissile();
        }


        player.thrustAnimation +=
            dt * 20;


        if (
            Math.random() <
            (lowPowerMode ? 0.3 : 0.7)
        ) {

            createThrustParticle();
        }


        if (
            player.invulnerable >
            0
        ) {

            player.invulnerable -=
                dt;
        }


        if (
            player.fireCooldown >
            0
        ) {

            player.fireCooldown -=
                dt;
        }


        if (
            player.rapidFireTimer >
            0
        ) {

            player.rapidFireTimer -=
                dt;
        }


        if (
            keys.fire &&
            player.fireCooldown <=
                0
        ) {

            fireWeapon();
        }
    }


    function getPlayerBounds() {

        return {

            x:
                player.x - 34,

            y:
                player.y - 25,

            width: 68,

            height: 50

        };
    }


    function drawPlayer() {

        if (

            player.invulnerable >
                0 &&

            Math.floor(
                player.invulnerable *
                    12
            ) %
                2 ===
                0

        ) {

            return;
        }


        const image =
            shipImages[
                selectedShip
            ];


        if (
            !image.complete ||
            image.naturalWidth === 0
        ) {

            drawFallbackShip();

            return;
        }


        ctx.save();


        ctx.translate(
            player.x,
            player.y
        );


        /*
         * Las imágenes originales
         * están orientadas verticalmente.
         * En vuelo normal apuntan a la
         * derecha; en modo combate (formato
         * vertical) apuntan hacia arriba,
         * hacia el jefe.
         */

        ctx.rotate(
            combatMode
                ? 0
                : Math.PI / 2
        );


        const ratio =
            image.width /
            image.height;


        let drawWidth = 110;

        let drawHeight =
            drawWidth /
            ratio;


        if (
            drawHeight >
            125
        ) {

            drawHeight =
                125;

            drawWidth =
                drawHeight *
                ratio;
        }


        ctx.shadowBlur = glowBlur(
                15
            );

        ctx.shadowColor =
            selectedShip === 0
                ? "rgba(0,217,255,0.45)"
                : "rgba(255,60,80,0.45)";


        ctx.drawImage(

            image,

            -drawWidth / 2,

            -drawHeight / 2,

            drawWidth,

            drawHeight

        );


        ctx.restore();
    }


    function drawFallbackShip() {

        ctx.save();

        ctx.translate(
            player.x,
            player.y
        );

        ctx.fillStyle =
            "#ffffff";

        ctx.beginPath();

        ctx.moveTo(
            42,
            0
        );

        ctx.lineTo(
            -28,
            -26
        );

        ctx.lineTo(
            -16,
            0
        );

        ctx.lineTo(
            -28,
            26
        );

        ctx.closePath();

        ctx.fill();

        ctx.restore();
    }


    /* =====================================================
       ARMAS
       ===================================================== */

    function rotateOffset(
        fx,
        fy,
        angle
    ) {

        const cos =
            Math.cos(angle);

        const sin =
            Math.sin(angle);

        return {

            dx:
                fx * cos -
                fy * sin,

            dy:
                fx * sin +
                fy * cos

        };
    }


    function fireWeapon() {

        const ship =
            ships[selectedShip];

        const rapid =
            player.rapidFireTimer >
            0;


        player.fireCooldown =
            rapid
                ? ship.fireRate *
                  0.45
                : ship.fireRate;


        const speed =
            ship.bulletSpeed;

        const angle =
            combatMode
                ? -Math.PI / 2
                : 0;


        function fireAt(
            fx,
            fy
        ) {

            const o =
                rotateOffset(
                    fx,
                    fy,
                    angle
                );

            createBullet(
                player.x + o.dx,
                player.y + o.dy,
                speed,
                ship.damage,
                angle
            );
        }


        if (
            ship.weapon ===
            "double"
        ) {

            fireAt(34, -14);

            fireAt(34, 14);

        } else {

            fireAt(35, 0);


            if (
                player.weaponLevel >=
                2
            ) {

                fireAt(30, -18);

                fireAt(30, 18);
            }


            if (
                player.weaponLevel >=
                3
            ) {

                fireAt(25, -28);

                fireAt(25, 28);
            }
        }


        shootSound();
    }


    function fireMissile() {

        const ship =
            ships[selectedShip];

        const angle =
            combatMode
                ? -Math.PI / 2
                : 0;

        const o =
            rotateOffset(
                30,
                0,
                angle
            );


        createBullet(

            player.x + o.dx,

            player.y + o.dy,

            ship.bulletSpeed *
                0.55,

            ship.damage * 5,

            angle,

            "missile"

        );


        player.missileCooldown =
            3.4;


        sound(
            140,
            0.16,
            "square",
            0.05
        );
    }


    function createBullet(
        x,
        y,
        speed,
        damage,
        angle,
        kind
    ) {

        angle = angle || 0;

        kind = kind || "bullet";

        const isMissile =
            kind === "missile";


        bullets.push({

            x,

            y,

            angle,

            kind,

            vx:
                Math.cos(angle) *
                speed,

            vy:
                Math.sin(angle) *
                speed,

            width:
                isMissile ? 24 : 17,

            height:
                isMissile ? 11 : 5,

            damage,

            life:
                isMissile ? 3.5 : 2,

            glow:
                isMissile
                    ? "#ffb300"
                    : (
                          Math.random() >
                          0.5
                              ? "#00d9ff"
                              : "#ffffff"
                      )

        });
    }


    function updateBullets(dt) {

        for (
            let i =
                bullets.length - 1;
            i >= 0;
            i--
        ) {

            const bullet =
                bullets[i];

            bullet.x +=
                bullet.vx * dt;

            bullet.y +=
                bullet.vy * dt;

            bullet.life -=
                dt;


            if (
                bullet.x >
                    WIDTH + 30 ||
                bullet.x <
                    -30 ||
                bullet.y >
                    HEIGHT + 30 ||
                bullet.y <
                    -30 ||
                bullet.life <= 0
            ) {

                bullets.splice(
                    i,
                    1
                );
            }
        }
    }


    function drawMissileSprite(
        bullet
    ) {

        const missileImage =
            missileImages[
                selectedShip
            ];

        if (
            !missileImage.complete ||
            missileImage.naturalWidth === 0
        ) {

            return false;
        }


        ctx.save();

        ctx.translate(
            bullet.x,
            bullet.y
        );

        /*
         * Igual que la nave: la imagen
         * original apunta hacia arriba.
         * En vuelo normal el misil viaja
         * a la derecha (+90°); en modo
         * combate ya viaja hacia arriba,
         * así que no hace falta rotar.
         */

        ctx.rotate(
            (bullet.angle || 0) +
            Math.PI / 2
        );

        ctx.shadowBlur = glowBlur(
                18
            );

        ctx.shadowColor =
            bullet.glow;

        const ratio =
            missileImage.width /
            missileImage.height;

        const drawHeight = 38;

        const drawWidth =
            drawHeight * ratio;

        ctx.drawImage(

            missileImage,

            -drawWidth / 2,

            -drawHeight / 2,

            drawWidth,

            drawHeight

        );

        ctx.restore();

        return true;
    }


    function drawBullets() {

        for (
            const bullet of bullets
        ) {

            if (
                bullet.kind ===
                    "missile" &&
                drawMissileSprite(
                    bullet
                )
            ) {

                continue;
            }


            ctx.save();

            ctx.translate(
                bullet.x,
                bullet.y
            );

            ctx.rotate(
                bullet.angle || 0
            );

            ctx.shadowBlur = glowBlur(
                bullet.kind ===
                "missile"
                    ? 16
                    : 10
            );

            ctx.shadowColor =
                bullet.glow;

            ctx.fillStyle =
                bullet.glow;

            ctx.fillRect(

                0,

                -bullet.height / 2,

                bullet.width,

                bullet.height

            );


            if (
                bullet.kind ===
                "missile"
            ) {

                ctx.fillStyle =
                    "rgba(255,140,0,0.75)";

                ctx.beginPath();

                ctx.moveTo(-2, -5);

                ctx.lineTo(-16, 0);

                ctx.lineTo(-2, 5);

                ctx.closePath();

                ctx.fill();
            }


            ctx.restore();
        }
    }


    /* =====================================================
       ENEMIGOS
       ===================================================== */

    function spawnEnemy() {

        let type;

        const roll =
            Math.random();


        if (
            gameTime > 30 &&
            roll < 0.15
        ) {

            type =
                enemyTypes[2];

        } else if (
            gameTime > 10 &&
            roll < 0.40
        ) {

            type =
                enemyTypes[1];

        } else {

            type =
                enemyTypes[0];
        }


        enemies.push({

            ...type,

            image:
                enemyImages[
                    type.imageIndex
                ],

            x:
                WIDTH +
                type.width,

            y:
                random(
                    45,
                    HEIGHT - 45
                ),

            maxHealth:
                type.health,

            phase:
                Math.random() *
                Math.PI *
                2,

            hitFlash: 0

        });
    }


    function updateEnemies(dt) {

        for (
            let i =
                enemies.length - 1;
            i >= 0;
            i--
        ) {

            const enemy =
                enemies[i];


            enemy.x -=
                (
                    enemy.speed +
                    worldSpeed *
                        0.35
                ) * dt;


            enemy.phase +=
                dt * 3;


            enemy.hitFlash -=
                dt;


            if (
                enemy.type ===
                "basic"
            ) {

                enemy.y +=
                    Math.sin(
                        enemy.phase
                    ) *
                    25 *
                    dt;
            }


            if (
                enemy.type ===
                "fast"
            ) {

                enemy.y +=
                    Math.sin(
                        enemy.phase *
                            1.8
                    ) *
                    55 *
                    dt;
            }


            if (
                enemy.type ===
                "tank"
            ) {

                enemy.y +=
                    Math.sin(
                        enemy.phase *
                            0.7
                    ) *
                    15 *
                    dt;
            }


            enemy.y =
                clamp(
                    enemy.y,
                    enemy.height / 2,
                    HEIGHT -
                        enemy.height /
                            2
                );


            if (
                enemy.x <
                -enemy.width -
                    30
            ) {

                enemies.splice(
                    i,
                    1
                );
            }
        }
    }


    function getEnemyBounds(
        enemy
    ) {

        return {

            x:
                enemy.x -
                enemy.width / 2,

            y:
                enemy.y -
                enemy.height / 2,

            width:
                enemy.width,

            height:
                enemy.height

        };
    }


    function drawEnemy(
        enemy
    ) {

        const image =
            enemy.image;

        if (
            !image ||
            !image.complete ||
            image.naturalWidth === 0
        ) {

            drawFallbackEnemy(
                enemy
            );

            return;
        }


        ctx.save();

        ctx.translate(
            enemy.x,
            enemy.y
        );

        /*
         * Los enemigos vienen orientados
         * hacia arriba, igual que la nave
         * del jugador. Los giramos para que
         * avancen hacia la izquierda (nariz
         * apuntando al jugador).
         */

        ctx.rotate(
            -Math.PI / 2
        );


        if (
            enemy.hitFlash >
            0
        ) {

            ctx.globalAlpha =
                0.55;
        }


        ctx.shadowBlur = glowBlur(
                14
            );

        ctx.shadowColor =
            enemy.color;


        const ratio =
            image.width /
            image.height;

        const drawHeight =
            enemy.height *
            1.9;

        const drawWidth =
            drawHeight *
            ratio;


        ctx.drawImage(

            image,

            -drawWidth / 2,

            -drawHeight / 2,

            drawWidth,

            drawHeight

        );


        if (
            enemy.type ===
            "tank"
        ) {

            ctx.globalAlpha =
                1;

            ctx.strokeStyle =
                "#ffd43b";

            ctx.lineWidth = 2;

            ctx.beginPath();

            ctx.arc(
                0,
                0,
                enemy.width *
                    0.62,
                0,
                Math.PI * 2
            );

            ctx.stroke();
        }


        ctx.restore();


        /* Barra de vida */

        if (
            enemy.health <
            enemy.maxHealth
        ) {

            const barWidth =
                enemy.width;

            const barX =
                enemy.x -
                barWidth / 2;

            const barY =
                enemy.y -
                enemy.height /
                    2 -
                9;


            ctx.fillStyle =
                "rgba(0,0,0,0.6)";

            ctx.fillRect(
                barX,
                barY,
                barWidth,
                4
            );


            ctx.fillStyle =
                enemy.color;

            ctx.fillRect(

                barX,

                barY,

                barWidth *
                    (
                        enemy.health /
                        enemy.maxHealth
                    ),

                4
            );
        }
    }


    function drawFallbackEnemy(
        enemy
    ) {

        ctx.save();

        ctx.translate(
            enemy.x,
            enemy.y
        );

        if (
            enemy.hitFlash >
            0
        ) {

            ctx.globalAlpha =
                0.5;
        }

        ctx.shadowBlur = glowBlur(
                12
            );

        ctx.shadowColor =
            enemy.color;

        ctx.fillStyle =
            "#11152c";

        ctx.strokeStyle =
            enemy.color;

        ctx.lineWidth = 3;

        ctx.beginPath();

        ctx.moveTo(
            enemy.width / 2,
            0
        );

        ctx.lineTo(
            -enemy.width / 2,
            -enemy.height / 2
        );

        ctx.lineTo(
            -enemy.width / 4,
            0
        );

        ctx.lineTo(
            -enemy.width / 2,
            enemy.height / 2
        );

        ctx.closePath();

        ctx.fill();

        ctx.stroke();

        ctx.restore();
    }


    /* =====================================================
       METEORITOS
       ===================================================== */

    function spawnMeteor() {

        const imageIndex =
            Math.floor(
                Math.random() *
                meteorImages.length
            );


        const image =
            meteorImages[
                imageIndex
            ];


        /*
         * Los dos meteoritos tienen
         * tamaños diferentes para
         * que no parezcan clones.
         */

        let size;


        if (
            imageIndex === 0
        ) {

            size =
                random(
                    45,
                    72
                );

        } else {

            size =
                random(
                    60,
                    95
                );
        }


        meteors.push({

            type: "meteor",

            image,

            variant:
                imageIndex,

            x:
                WIDTH +
                size,

            y:
                random(
                    size / 2 + 15,
                    HEIGHT -
                        size / 2 -
                        15
                ),

            width:
                size,

            height:
                size,

            speed:
                random(
                    100,
                    175
                ),

            health:
                imageIndex === 0
                    ? 2
                    : 4,

            maxHealth:
                imageIndex === 0
                    ? 2
                    : 4,

            score:
                imageIndex === 0
                    ? 15
                    : 25,

            rotation:
                random(
                    0,
                    Math.PI * 2
                ),

            rotationSpeed:
                random(
                    -1.8,
                    1.8
                ),

            phase:
                random(
                    0,
                    Math.PI * 2
                ),

            hitFlash: 0

        });
    }


    function updateMeteors(dt) {

        for (
            let i =
                meteors.length - 1;
            i >= 0;
            i--
        ) {

            const meteor =
                meteors[i];


            meteor.x -=
                (
                    meteor.speed +
                    worldSpeed *
                        0.30
                ) * dt;


            meteor.rotation +=
                meteor.rotationSpeed *
                dt;


            meteor.phase +=
                dt * 2;


            /*
             * Movimiento suave vertical.
             */

            meteor.y +=
                Math.sin(
                    meteor.phase
                ) *
                15 *
                dt;


            meteor.y =
                clamp(
                    meteor.y,
                    meteor.height / 2,
                    HEIGHT -
                        meteor.height /
                            2
                );


            meteor.hitFlash -=
                dt;


            if (
                meteor.x <
                -meteor.width -
                    30
            ) {

                meteors.splice(
                    i,
                    1
                );
            }
        }
    }


    function getMeteorBounds(
        meteor
    ) {

        /*
         * Reducimos ligeramente
         * el área de colisión.
         * Esto hace que el juego
         * se sienta más justo.
         */

        const padding =
            meteor.width *
            0.13;


        return {

            x:
                meteor.x -
                meteor.width / 2 +
                padding,

            y:
                meteor.y -
                meteor.height / 2 +
                padding,

            width:
                meteor.width -
                padding * 2,

            height:
                meteor.height -
                padding * 2

        };
    }


    function drawMeteor(
        meteor
    ) {

        const image =
            meteor.image;


        if (
            !image ||
            !image.complete ||
            image.naturalWidth === 0
        ) {

            drawFallbackMeteor(
                meteor
            );

            return;
        }


        ctx.save();


        ctx.translate(
            meteor.x,
            meteor.y
        );


        ctx.rotate(
            meteor.rotation
        );


        if (
            meteor.hitFlash >
            0
        ) {

            ctx.globalAlpha =
                0.55;
        }


        /*
         * Sombra/glow muy suave.
         * No queremos que parezca
         * una nave.
         */

        ctx.shadowBlur = glowBlur(
                8
            );

        ctx.shadowColor =
            meteor.variant === 0
                ? "rgba(255,120,50,0.25)"
                : "rgba(180,180,180,0.25)";


        ctx.drawImage(

            image,

            -meteor.width / 2,

            -meteor.height / 2,

            meteor.width,

            meteor.height

        );


        ctx.restore();


        /*
         * Barra de resistencia
         * solamente después de
         * recibir daño.
         */

        if (
            meteor.health <
            meteor.maxHealth
        ) {

            const barWidth =
                meteor.width *
                0.8;

            const barX =
                meteor.x -
                barWidth / 2;

            const barY =
                meteor.y -
                meteor.height /
                    2 -
                8;


            ctx.fillStyle =
                "rgba(0,0,0,0.7)";

            ctx.fillRect(
                barX,
                barY,
                barWidth,
                4
            );


            ctx.fillStyle =
                meteor.variant === 0
                    ? "#ff8a3d"
                    : "#b7c0d8";


            ctx.fillRect(

                barX,

                barY,

                barWidth *
                    (
                        meteor.health /
                        meteor.maxHealth
                    ),

                4
            );
        }
    }


    function drawFallbackMeteor(
        meteor
    ) {

        ctx.save();

        ctx.translate(
            meteor.x,
            meteor.y
        );

        ctx.rotate(
            meteor.rotation
        );


        ctx.fillStyle =
            "#5e5a65";

        ctx.strokeStyle =
            "#9b96a5";

        ctx.lineWidth = 3;


        ctx.beginPath();

        ctx.moveTo(
            -20,
            -8
        );

        ctx.lineTo(
            -8,
            -25
        );

        ctx.lineTo(
            13,
            -19
        );

        ctx.lineTo(
            25,
            0
        );

        ctx.lineTo(
            10,
            22
        );

        ctx.lineTo(
            -14,
            18
        );

        ctx.lineTo(
            -25,
            5
        );

        ctx.closePath();

        ctx.fill();

        ctx.stroke();


        ctx.restore();
    }


    /* =====================================================
       JEFES — MODO COMBATE
       ===================================================== */

    function checkLevelProgress() {

        if (
            combatMode ||
            level > 2
        ) {

            return;
        }

        if (
            score >=
            LEVEL_THRESHOLDS[
                level - 1
            ]
        ) {

            triggerBossEncounter(
                level
            );
        }
    }


    function triggerBossEncounter(
        levelNumber
    ) {

        combatMode = true;

        enemies = [];

        meteors = [];

        powerUps = [];

        bossBullets = [];


        setCanvasOrientation(
            true
        );


        if (isTouchDevice) {

            shieldButton.classList.remove(
                "hidden"
            );
        }


        spawnBoss(levelNumber);


        showBanner(

            "¡MODO COMBATE! " +
                BOSS_DATA[
                    levelNumber - 1
                ].name,

            2.6,

            BOSS_DATA[
                levelNumber - 1
            ].color

        );


        setControlsHintText(true);
    }


    function spawnBoss(
        levelNumber
    ) {

        const data =
            BOSS_DATA[
                levelNumber - 1
            ];

        boss = {

            name: data.name,

            image: data.image,

            color: data.color,

            health:
                data.maxHealth,

            maxHealth:
                data.maxHealth,

            x: WIDTH / 2,

            y: -180,

            targetY:
                HEIGHT * 0.24,

            width: 120,

            height: 120,

            phase:
                Math.random() *
                Math.PI * 2,

            fireTimer: 1.4,

            hitFlash: 0,

            dashTimer:
                random(4, 6),

            dashing: false,

            entering: true

        };
    }


    function updateBoss(dt) {

        if (!boss) {
            return;
        }

        if (boss.entering) {

            boss.y +=
                (
                    boss.targetY -
                    boss.y
                ) *
                Math.min(
                    1,
                    dt * 2.2
                );

            if (
                Math.abs(
                    boss.targetY -
                        boss.y
                ) < 2
            ) {

                boss.entering =
                    false;

                boss.y =
                    boss.targetY;
            }

        } else {

            const enraged =
                boss.health /
                    boss.maxHealth <
                0.45;

            const speedMul =
                enraged ? 1.8 : 1;


            boss.phase +=
                dt *
                1.3 *
                speedMul;


            boss.x =
                clamp(

                    WIDTH / 2 +
                        Math.sin(
                            boss.phase
                        ) *
                        (WIDTH * 0.32),

                    70,

                    WIDTH - 70

                );

            boss.y =
                boss.targetY +
                Math.sin(
                    boss.phase * 0.7
                ) *
                (enraged ? 34 : 16);


            /*
             * Cada cierto tiempo el jefe
             * hace una embestida corta
             * hacia el jugador y regresa.
             */

            boss.dashTimer =
                (boss.dashTimer ||
                    0) - dt;

            if (
                boss.dashTimer <=
                    0 &&
                !boss.dashing
            ) {

                boss.dashing = true;

                boss.dashElapsed = 0;

                boss.dashTimer =
                    random(4, 7);
            }

            if (boss.dashing) {

                boss.dashElapsed +=
                    dt;

                boss.x +=
                    Math.sin(
                        boss.dashElapsed *
                            Math.PI
                    ) *
                    220 *
                    dt;

                if (
                    boss.dashElapsed >
                    0.9
                ) {

                    boss.dashing = false;
                }
            }


            boss.fireTimer -=
                dt;

            if (
                boss.fireTimer <=
                0
            ) {

                fireBossWeapon(
                    levelOfBoss(),
                    enraged
                );

                boss.fireTimer =
                    (
                        enraged
                            ? random(
                                  0.45,
                                  0.8
                              )
                            : random(
                                  0.85,
                                  1.5
                              )
                    );
            }
        }

        boss.hitFlash -=
            dt;
    }


    function levelOfBoss() {

        return level;
    }


    function fireBossWeapon(
        levelNumber,
        enraged
    ) {

        const dx =
            player.x - boss.x;

        const dy =
            player.y - boss.y;

        const dist =
            Math.max(
                1,
                Math.hypot(
                    dx,
                    dy
                )
            );

        const speed =
            330 +
            levelNumber * 40 +
            (enraged ? 60 : 0);

        const baseAngle =
            Math.atan2(
                dy,
                dx
            );


        let angles;

        if (
            levelNumber >= 2 &&
            enraged
        ) {

            angles = [
                -0.42,
                -0.21,
                0,
                0.21,
                0.42
            ];

        } else if (
            levelNumber >= 2 ||
            enraged
        ) {

            angles = [
                -0.28,
                0,
                0.28
            ];

        } else {

            angles = [0];
        }


        angles.forEach(
            offset => {

                const angle =
                    baseAngle +
                    offset;

                bossBullets.push({

                    x:
                        boss.x -
                        boss.width *
                            0.3,

                    y: boss.y,

                    vx:
                        Math.cos(
                            angle
                        ) * speed,

                    vy:
                        Math.sin(
                            angle
                        ) * speed,

                    life: 3,

                    color:
                        boss.color

                });
            }
        );


        sound(
            220,
            0.08,
            "sawtooth",
            0.03
        );
    }


    function updateBossBullets(
        dt
    ) {

        for (
            let i =
                bossBullets.length - 1;
            i >= 0;
            i--
        ) {

            const b =
                bossBullets[i];

            b.x +=
                b.vx * dt;

            b.y +=
                b.vy * dt;

            b.life -= dt;

            if (
                b.life <= 0 ||
                b.x < -30 ||
                b.x > WIDTH + 30 ||
                b.y < -30 ||
                b.y > HEIGHT + 30
            ) {

                bossBullets.splice(
                    i,
                    1
                );
            }
        }
    }


    function getBossBounds() {

        return {

            x:
                boss.x -
                boss.width / 2,

            y:
                boss.y -
                boss.height / 2,

            width:
                boss.width,

            height:
                boss.height

        };
    }


    function handleBossCollisions() {

        if (!boss) {
            return;
        }

        const playerBounds =
            getPlayerBounds();

        const bossBounds =
            getBossBounds();


        /* balas del jugador contra el jefe */

        for (
            let b =
                bullets.length - 1;
            b >= 0;
            b--
        ) {

            const bullet =
                bullets[b];

            const bulletRect = {

                x:
                    bullet.x -
                    bullet.width / 2,

                y:
                    bullet.y -
                    bullet.height / 2,

                width:
                    bullet.width,

                height:
                    bullet.height

            };

            if (
                rectsCollide(
                    bulletRect,
                    bossBounds
                )
            ) {

                boss.health -=
                    bullet.damage;

                boss.hitFlash =
                    0.1;

                createExplosion(
                    bullet.x,
                    bullet.y,
                    5,
                    "#ffffff"
                );

                bullets.splice(
                    b,
                    1
                );

                if (
                    boss.health <=
                    0
                ) {

                    defeatBoss();

                    return;
                }
            }
        }


        if (!boss) {
            return;
        }


        /* balas del jefe contra el jugador */

        for (
            let i =
                bossBullets.length - 1;
            i >= 0;
            i--
        ) {

            const bb =
                bossBullets[i];

            const bbRect = {

                x: bb.x - 5,

                y: bb.y - 5,

                width: 10,

                height: 10

            };

            if (
                rectsCollide(
                    bbRect,
                    playerBounds
                )
            ) {

                bossBullets.splice(
                    i,
                    1
                );

                if (
                    player.shielding
                ) {

                    createExplosion(
                        bb.x,
                        bb.y,
                        6,
                        "#00d9ff"
                    );

                    shieldEnergy =
                        Math.max(
                            0,
                            shieldEnergy -
                                8
                        );

                } else if (
                    player.invulnerable <=
                    0
                ) {

                    damagePlayer();
                }
            }
        }


        /* choque cuerpo a cuerpo */

        if (
            boss &&
            !boss.entering &&
            !player.shielding &&
            player.invulnerable <=
                0 &&
            rectsCollide(
                playerBounds,
                bossBounds
            )
        ) {

            damagePlayer();
        }
    }


    function defeatBoss() {

        createExplosion(

            boss.x,

            boss.y,

            50,

            boss.color

        );

        explosionSound();


        const defeatedLevel =
            level;

        boss = null;

        bossBullets = [];

        combatMode = false;

        level++;


        setCanvasOrientation(
            false
        );

        shieldButton.classList.add(
            "hidden"
        );


        if (level > 2) {

            endGame(true);

        } else {

            showBanner(
                "NAVE DESTRUIDA — RASTREANDO LA SEGUNDA NAVE",
                3,
                "#5dffb0"
            );

            setControlsHintText(false);

            enemyTimer = -1.5;

            meteorTimer = -1.5;
        }
    }


    function showBanner(
        text,
        duration,
        color
    ) {

        combatBannerText = text;

        combatBannerTimer =
            duration;

        combatBannerColor =
            color || "#ff4264";
    }


    function drawBoss() {

        if (!boss) {
            return;
        }

        const image =
            boss.image;

        ctx.save();

        ctx.translate(
            boss.x,
            boss.y
        );

        ctx.rotate(
            Math.PI
        );

        if (
            boss.hitFlash > 0
        ) {

            ctx.globalAlpha =
                0.55;
        }

        ctx.shadowBlur = glowBlur(
                22
            );

        ctx.shadowColor =
            boss.color;

        if (
            image &&
            image.complete &&
            image.naturalWidth
        ) {

            const ratio =
                image.width /
                image.height;

            const drawHeight =
                boss.height * 1.9;

            const drawWidth =
                drawHeight * ratio;

            ctx.drawImage(

                image,

                -drawWidth / 2,

                -drawHeight / 2,

                drawWidth,

                drawHeight

            );
        }

        ctx.restore();


        const barWidth = 260;

        const barX =
            WIDTH / 2 -
            barWidth / 2;

        const barY = 34;

        ctx.fillStyle =
            "rgba(0,0,0,0.55)";

        ctx.fillRect(
            barX,
            barY,
            barWidth,
            10
        );

        ctx.fillStyle =
            boss.color;

        ctx.fillRect(

            barX,

            barY,

            barWidth *
                (
                    boss.health /
                    boss.maxHealth
                ),

            10
        );

        ctx.strokeStyle =
            "rgba(255,255,255,0.4)";

        ctx.strokeRect(
            barX,
            barY,
            barWidth,
            10
        );

        ctx.font =
            "bold 13px Courier New";

        ctx.textAlign =
            "center";

        ctx.fillStyle =
            "#ffffff";

        ctx.fillText(
            boss.name,
            WIDTH / 2,
            barY - 8
        );
    }


    function drawBossBullets() {

        bossBullets.forEach(
            b => {

                ctx.save();

                ctx.shadowBlur = glowBlur(
                10
            );

                ctx.shadowColor =
                    b.color;

                ctx.fillStyle =
                    b.color;

                ctx.beginPath();

                ctx.arc(
                    b.x,
                    b.y,
                    5,
                    0,
                    Math.PI * 2
                );

                ctx.fill();

                ctx.restore();
            }
        );
    }


    function drawShieldEffect() {

        if (!player.shielding) {
            return;
        }

        ctx.save();

        ctx.translate(
            player.x,
            player.y
        );

        ctx.beginPath();

        ctx.arc(
            0,
            0,
            46,
            0,
            Math.PI * 2
        );

        ctx.strokeStyle =
            "rgba(0,217,255,0.85)";

        ctx.lineWidth = 3;

        ctx.shadowBlur = glowBlur(
                18
            );

        ctx.shadowColor =
            "#00d9ff";

        ctx.stroke();

        ctx.fillStyle =
            "rgba(0,217,255,0.12)";

        ctx.fill();

        ctx.restore();
    }


    /* =====================================================
       POWER UPS
       ===================================================== */

    function spawnPowerUp() {

        const types =
            Object.keys(
                powerUpTypes
            );


        const type =
            types[
                Math.floor(
                    Math.random() *
                    types.length
                )
            ];


        powerUps.push({

            type,

            x:
                WIDTH + 40,

            y:
                random(
                    60,
                    HEIGHT - 60
                ),

            width: 28,

            height: 28,

            speed: 150,

            rotation: 0,

            phase:
                random(
                    0,
                    Math.PI * 2
                )

        });
    }


    function updatePowerUps(dt) {

        for (
            let i =
                powerUps.length - 1;
            i >= 0;
            i--
        ) {

            const powerUp =
                powerUps[i];


            powerUp.x -=
                powerUp.speed *
                dt;


            powerUp.rotation +=
                dt * 4;


            powerUp.phase +=
                dt * 3;


            powerUp.y +=
                Math.sin(
                    powerUp.phase
                ) *
                30 *
                dt;


            if (
                powerUp.x <
                -50
            ) {

                powerUps.splice(
                    i,
                    1
                );
            }
        }
    }


    function drawPowerUps() {

        for (
            const powerUp of
                powerUps
        ) {

            const data =
                powerUpTypes[
                    powerUp.type
                ];


            ctx.save();


            ctx.translate(
                powerUp.x,
                powerUp.y
            );


            ctx.rotate(
                powerUp.rotation
            );


            ctx.shadowBlur = glowBlur(
                15
            );

            ctx.shadowColor =
                data.color;


            ctx.strokeStyle =
                data.color;

            ctx.lineWidth = 3;


            ctx.strokeRect(
                -14,
                -14,
                28,
                28
            );


            ctx.fillStyle =
                "rgba(5,10,25,0.85)";


            ctx.fillRect(
                -11,
                -11,
                22,
                22
            );


            ctx.rotate(
                -powerUp.rotation
            );


            ctx.fillStyle =
                data.color;


            ctx.font =
                "bold 16px Courier New";


            ctx.textAlign =
                "center";


            ctx.textBaseline =
                "middle";


            ctx.fillText(
                data.symbol,
                0,
                1
            );


            ctx.restore();
        }
    }


    function collectPowerUp(
        powerUp
    ) {

        if (
            powerUp.type ===
            "rapid"
        ) {

            player.rapidFireTimer =
                8;
        }


        if (
            powerUp.type ===
            "life"
        ) {

            player.lives =
                Math.min(
                    player.lives + 1,
                    5
                );
        }


        if (
            powerUp.type ===
            "weapon"
        ) {

            player.weaponLevel =
                Math.min(
                    player.weaponLevel + 1,
                    3
                );
        }


        createExplosion(

            powerUp.x,

            powerUp.y,

            12,

            powerUpTypes[
                powerUp.type
            ].color

        );


        powerSound();
    }


    /* =====================================================
       COLISIONES
       ===================================================== */

    function handleCollisions() {

        const playerBounds =
            getPlayerBounds();


        /* ---------------------------------
           BALAS CONTRA METEORITOS
           --------------------------------- */

        for (
            let b =
                bullets.length - 1;
            b >= 0;
            b--
        ) {

            const bullet =
                bullets[b];


            const bulletRect = {

                x:
                    bullet.x -
                    bullet.width / 2,

                y:
                    bullet.y -
                    bullet.height / 2,

                width:
                    bullet.width,

                height:
                    bullet.height

            };


            let bulletUsed =
                false;


            for (
                let m =
                    meteors.length - 1;
                m >= 0;
                m--
            ) {

                const meteor =
                    meteors[m];


                if (
                    rectsCollide(
                        bulletRect,
                        getMeteorBounds(
                            meteor
                        )
                    )
                ) {

                    meteor.health -=
                        bullet.damage;


                    meteor.hitFlash =
                        0.10;


                    createExplosion(

                        bullet.x,

                        bullet.y,

                        4,

                        "#ffffff"

                    );


                    bullets.splice(
                        b,
                        1
                    );


                    bulletUsed =
                        true;


                    if (
                        meteor.health <=
                        0
                    ) {

                        createExplosion(

                            meteor.x,

                            meteor.y,

                            meteor.variant ===
                                0
                                ? 20
                                : 28,

                            meteor.variant ===
                                0
                                ? "#ff7138"
                                : "#b7c0d8"

                        );


                        score +=
                            meteor.score;


                        explosionSound();


                        /*
                         * Los meteoritos grandes
                         * tienen una pequeña
                         * posibilidad de soltar
                         * power-up.
                         */

                        if (
                            Math.random() <
                            0.12
                        ) {

                            spawnPowerUpAt(

                                meteor.x,

                                meteor.y

                            );
                        }


                        meteors.splice(
                            m,
                            1
                        );
                    }


                    break;
                }
            }


            if (
                bulletUsed
            ) {
                continue;
            }


            /* ---------------------------------
               BALAS CONTRA ENEMIGOS
               --------------------------------- */

            for (
                let e =
                    enemies.length - 1;
                e >= 0;
                e--
            ) {

                const enemy =
                    enemies[e];


                if (
                    rectsCollide(
                        bulletRect,
                        getEnemyBounds(
                            enemy
                        )
                    )
                ) {

                    enemy.health -=
                        bullet.damage;


                    enemy.hitFlash =
                        0.10;


                    createExplosion(

                        bullet.x,

                        bullet.y,

                        4,

                        "#ffffff"

                    );


                    bullets.splice(
                        b,
                        1
                    );


                    bulletUsed =
                        true;


                    if (
                        enemy.health <=
                        0
                    ) {

                        createExplosion(

                            enemy.x,

                            enemy.y,

                            enemy.type ===
                                "tank"
                                ? 35
                                : 20,

                            enemy.color

                        );


                        score +=
                            enemy.score;


                        explosionSound();


                        if (
                            Math.random() <
                            0.10
                        ) {

                            spawnPowerUpAt(

                                enemy.x,

                                enemy.y

                            );
                        }


                        enemies.splice(
                            e,
                            1
                        );
                    }


                    break;
                }
            }
        }


        /* ---------------------------------
           METEORITOS CONTRA JUGADOR
           --------------------------------- */

        if (
            player.invulnerable <=
            0
        ) {

            for (
                let i =
                    meteors.length - 1;
                i >= 0;
                i--
            ) {

                const meteor =
                    meteors[i];


                if (
                    rectsCollide(
                        playerBounds,
                        getMeteorBounds(
                            meteor
                        )
                    )
                ) {

                    meteors.splice(
                        i,
                        1
                    );


                    createExplosion(

                        meteor.x,

                        meteor.y,

                        25,

                        meteor.variant ===
                            0
                            ? "#ff7138"
                            : "#b7c0d8"

                    );


                    damagePlayer();

                    break;
                }
            }
        }


        /* ---------------------------------
           ENEMIGOS CONTRA JUGADOR
           --------------------------------- */

        if (
            player.invulnerable <=
            0
        ) {

            for (
                let i =
                    enemies.length - 1;
                i >= 0;
                i--
            ) {

                const enemy =
                    enemies[i];


                if (
                    rectsCollide(
                        playerBounds,
                        getEnemyBounds(
                            enemy
                        )
                    )
                ) {

                    enemies.splice(
                        i,
                        1
                    );


                    createExplosion(

                        enemy.x,

                        enemy.y,

                        20,

                        enemy.color

                    );


                    damagePlayer();

                    break;
                }
            }
        }


        /* ---------------------------------
           POWER UPS CONTRA JUGADOR
           --------------------------------- */

        for (
            let i =
                powerUps.length - 1;
            i >= 0;
            i--
        ) {

            const powerUp =
                powerUps[i];


            const powerBounds = {

                x:
                    powerUp.x -
                    powerUp.width /
                        2,

                y:
                    powerUp.y -
                    powerUp.height /
                        2,

                width:
                    powerUp.width,

                height:
                    powerUp.height

            };


            if (
                rectsCollide(
                    playerBounds,
                    powerBounds
                )
            ) {

                collectPowerUp(
                    powerUp
                );


                powerUps.splice(
                    i,
                    1
                );
            }
        }
    }


    function spawnPowerUpAt(
        x,
        y
    ) {

        const types =
            Object.keys(
                powerUpTypes
            );


        const type =
            types[
                Math.floor(
                    Math.random() *
                    types.length
                )
            ];


        powerUps.push({

            type,

            x,

            y,

            width: 28,

            height: 28,

            speed: 150,

            rotation: 0,

            phase: 0

        });
    }


    function damagePlayer() {

        player.lives--;

        player.invulnerable =
            1.8;


        createExplosion(

            player.x,

            player.y,

            30,

            "#ff4264"

        );


        hitSound();


        if (
            player.lives <=
            0
        ) {

            endGame();
        }
    }


    /* =====================================================
       HUD
       ===================================================== */

    function updateHUD() {

        scoreElement.textContent =
            Math.floor(
                score
            );


        bestElement.textContent =
            Math.floor(
                bestScore
            );
    }


    function drawCanvasHUD() {

        const lifeX = 18;

        const lifeY = 20;


        ctx.font =
            "bold 12px Courier New";

        ctx.textAlign =
            "left";


        ctx.fillStyle =
            "#9299b7";


        ctx.fillText(

            "CASCO",

            lifeX,

            lifeY

        );


        for (
            let i = 0;
            i < 5;
            i++
        ) {

            const x =
                lifeX +
                58 +
                i * 17;


            ctx.fillStyle =
                i < player.lives
                    ? "#ff4264"
                    : "rgba(255,255,255,0.10)";


            ctx.fillRect(

                x,

                lifeY - 9,

                12,

                8

            );
        }


        ctx.fillStyle =
            "#9299b7";


        ctx.fillText(

            "ARMA " +
                player.weaponLevel,

            lifeX,

            lifeY + 25

        );


        if (
            player.rapidFireTimer >
            0
        ) {

            ctx.fillStyle =
                "#00d9ff";


            ctx.fillText(

                "RÁFAGA " +
                    player.rapidFireTimer.toFixed(
                        1
                    ),

                lifeX,

                lifeY + 43

            );
        }


        if (combatMode) {

            ctx.font =
                "bold 11px Courier New";

            ctx.fillStyle =
                "#9299b7";

            ctx.fillText(
                "ESCUDO",
                lifeX,
                HEIGHT - 22
            );

            ctx.fillStyle =
                "rgba(255,255,255,0.12)";

            ctx.fillRect(
                lifeX + 60,
                HEIGHT - 30,
                120,
                10
            );

            ctx.fillStyle =
                player.shielding
                    ? "#5dffb0"
                    : "#00d9ff";

            ctx.fillRect(
                lifeX + 60,
                HEIGHT - 30,
                120 *
                    (shieldEnergy /
                        100),
                10
            );
        }


        if (
            combatBannerTimer >
            0
        ) {

            ctx.save();

            ctx.globalAlpha =
                Math.min(
                    1,
                    combatBannerTimer
                );

            ctx.textAlign =
                "center";

            ctx.font =
                "bold 26px Impact, Arial Black, sans-serif";

            ctx.fillStyle =
                combatBannerColor;

            ctx.shadowColor =
                combatBannerColor;

            ctx.shadowBlur = glowBlur(
                20
            );

            ctx.fillText(
                combatBannerText,
                WIDTH / 2,
                HEIGHT / 2 - 60
            );

            ctx.restore();
        }


        if (paused) {

            ctx.fillStyle =
                "rgba(0,0,0,0.55)";


            ctx.fillRect(

                0,

                0,

                WIDTH,

                HEIGHT

            );


            ctx.fillStyle =
                "#ffffff";


            ctx.font =
                "bold 34px Courier New";


            ctx.textAlign =
                "center";


            ctx.fillText(

                "PAUSA",

                WIDTH / 2,

                HEIGHT / 2

            );


            ctx.font =
                "12px Courier New";


            ctx.fillStyle =
                "#00d9ff";


            ctx.fillText(

                "P PARA CONTINUAR",

                WIDTH / 2,

                HEIGHT / 2 + 35

            );
        }
    }


    /* =====================================================
       DIFICULTAD
       ===================================================== */

    function updateDifficulty(dt) {

        difficultyTimer +=
            dt;


        if (
            difficultyTimer >=
            10
        ) {

            difficultyTimer = 0;


            enemySpawnRate =
                Math.max(

                    0.55,

                    enemySpawnRate -
                        0.07

                );


            meteorSpawnRate =
                Math.max(

                    0.90,

                    meteorSpawnRate -
                        0.10

                );


            worldSpeed +=
                7;
        }
    }


    /* =====================================================
       PUNTUACIÓN
       ===================================================== */

    function updateScore(dt) {

        score +=
            dt *
            (
                7 +
                worldSpeed *
                    0.015
            );
    }


    /* =====================================================
       INICIAR JUEGO
       ===================================================== */

    function startGame() {

        initAudio();


        gameState =
            STATE.PLAYING;


        paused = false;


        score = 0;

        gameTime = 0;


        enemyTimer = 0;

        meteorTimer = 0;

        powerUpTimer = 0;

        difficultyTimer = 0;


        enemySpawnRate =
            1.35;

        meteorSpawnRate =
            2.2;

        worldSpeed =
            150;


        bullets = [];

        enemies = [];

        meteors = [];

        powerUps = [];

        particles = [];


        resetPlayer();


        selectScreen.classList.add(
            "hidden"
        );

        storyScreen.classList.add(
            "hidden"
        );

        tutorialScreen.classList.add(
            "hidden"
        );

        gameoverScreen.classList.add(
            "hidden"
        );

        gameoverScreen.classList.remove(
            "victory"
        );


        hud.classList.remove(
            "hidden"
        );

        setControlsHintText(false);

        controlsHint.classList.remove(
            "hidden"
        );


        if (isTouchDevice) {

            fireButton.classList.remove(
                "hidden"
            );

            missileButton.classList.remove(
                "hidden"
            );
        }


        shieldButton.classList.add(
            "hidden"
        );


        updateHUD();
    }


    /* =====================================================
       GAME OVER
       ===================================================== */

    function endGame(
        victory
    ) {

        gameState =
            STATE.GAMEOVER;


        keys.fire = false;

        keys.missile = false;

        keys.shield = false;


        if (combatMode) {

            combatMode = false;

            boss = null;

            bossBullets = [];

            setCanvasOrientation(
                false
            );
        }


        if (
            score >
            bestScore
        ) {

            bestScore =
                Math.floor(
                    score
                );


            saveBestScore(
                bestScore
            );
        }


        finalScoreElement.textContent =
            Math.floor(
                score
            ) +
            " m";


        updateHUD();


        hud.classList.add(
            "hidden"
        );

        controlsHint.classList.add(
            "hidden"
        );

        fireButton.classList.add(
            "hidden"
        );

        missileButton.classList.add(
            "hidden"
        );

        shieldButton.classList.add(
            "hidden"
        );


        if (victory) {

            gameoverSubtitle.textContent =
                "MISIÓN CUMPLIDA — LAS DOS NAVES ENEMIGAS FUERON DESTRUIDAS";

            gameoverScreen.classList.add(
                "victory"
            );

        } else {

            gameoverSubtitle.textContent =
                "VIAJE INTERRUMPIDO";

            gameoverScreen.classList.remove(
                "victory"
            );
        }


        gameoverScreen.classList.remove(
            "hidden"
        );
    }


    /* =====================================================
       TUTORIAL
       ===================================================== */

    let tutorialTimer = 0;

    let tutorialStep = 0;


    function startTutorial() {

        initAudio();


        gameState =
            STATE.TUTORIAL;


        tutorialTimer = 0;

        tutorialStep = 0;


        selectScreen.classList.add(
            "hidden"
        );

        gameoverScreen.classList.add(
            "hidden"
        );


        tutorialScreen.classList.remove(
            "hidden"
        );


        tutorialProgress.style.width =
            "0%";


        updateTutorialText();
    }


    function updateTutorialText() {

        if (
            tutorialStep ===
            0
        ) {

            tutorialTitle.textContent =
                "MUÉVETE";


            tutorialIcon.textContent =
                isTouchDevice
                    ? "👆"
                    : "↑ ↓";


            tutorialText.textContent =
                isTouchDevice
                    ? "Desliza el dedo por la pantalla para mover la nave."
                    : "Usa las flechas ↑ ↓ o las teclas W / S para mover la nave.";


            tutorialProgress.style.width =
                "0%";
        }


        if (
            tutorialStep ===
            1
        ) {

            tutorialTitle.textContent =
                "DISPARA";


            tutorialIcon.textContent =
                isTouchDevice
                    ? "🔴"
                    : "⎵";


            tutorialText.textContent =
                isTouchDevice
                    ? "Mantén presionado el botón rojo para destruir enemigos y meteoritos."
                    : "Mantén presionada ESPACIO para destruir enemigos y meteoritos.";


            tutorialProgress.style.width =
                "33%";
        }


        if (
            tutorialStep ===
            2
        ) {

            tutorialTitle.textContent =
                "SOBREVIVE";


            tutorialIcon.textContent =
                "★";


            tutorialText.textContent =
                "Esquiva meteoritos, destruye enemigos y recoge mejoras.";


            tutorialProgress.style.width =
                "66%";
        }
    }


    function updateTutorial(dt) {

        tutorialTimer +=
            dt;


        const duration =
            2.8;


        if (
            tutorialTimer >=
            duration
        ) {

            tutorialTimer = 0;

            tutorialStep++;


            if (
                tutorialStep >=
                3
            ) {

                startGame();

                return;
            }


            updateTutorialText();


        } else {

            const progress =
                tutorialStep *
                    33.33 +

                (
                    tutorialTimer /
                    duration
                ) *
                    33.33;


            tutorialProgress.style.width =
                Math.min(
                    100,
                    progress
                ) +
                "%";
        }
    }


    /* =====================================================
       SELECCIÓN DE NAVE
       ===================================================== */

    function selectShip(
        index
    ) {

        selectedShip =
            index;


        shipCards.forEach(
            card => {

                card.classList.toggle(

                    "selected",

                    Number(
                        card.dataset.ship
                    ) === index

                );
            }
        );


        initAudio();


        sound(

            index === 0
                ? 500
                : 700,

            0.08,

            "triangle",

            0.03

        );
    }


    shipCards.forEach(
        card => {

            card.addEventListener(
                "click",
                () => {

                    selectShip(

                        Number(
                            card.dataset.ship
                        )

                    );
                }
            );
        }
    );


    /* =====================================================
       BOTONES
       ===================================================== */

    startButton.addEventListener(
        "click",
        () => {

            initAudio();

            selectScreen.classList.add(
                "hidden"
            );

            storyScreen.classList.remove(
                "hidden"
            );
        }
    );


    storyContinueButton.addEventListener(
        "click",
        () => {

            storyScreen.classList.add(
                "hidden"
            );

            startTutorial();
        }
    );


    skipTutorialButton.addEventListener(
        "click",
        () => {

            startGame();
        }
    );


    retryButton.addEventListener(
        "click",
        () => {

            startGame();
        }
    );


    changeShipButton.addEventListener(
        "click",
        () => {

            gameState =
                STATE.SELECT;


            gameoverScreen.classList.add(
                "hidden"
            );

            gameoverScreen.classList.remove(
                "victory"
            );


            hud.classList.add(
                "hidden"
            );


            controlsHint.classList.add(
                "hidden"
            );


            fireButton.classList.add(
                "hidden"
            );

            missileButton.classList.add(
                "hidden"
            );

            shieldButton.classList.add(
                "hidden"
            );


            selectScreen.classList.remove(
                "hidden"
            );
        }
    );


    /* =====================================================
       TECLADO
       ===================================================== */

    window.addEventListener(
        "keydown",
        event => {

            const key =
                event.key.toLowerCase();


            if (

                key ===
                    "arrowup" ||

                key ===
                    "arrowdown" ||

                key ===
                    "arrowleft" ||

                key ===
                    "arrowright" ||

                key === "w" ||

                key === "s" ||

                key === "a" ||

                key === "d" ||

                key === " "

            ) {

                event.preventDefault();
            }


            if (

                key ===
                    "arrowup" ||

                key === "w"

            ) {

                keys.up = true;
            }


            if (

                key ===
                    "arrowdown" ||

                key === "s"

            ) {

                keys.down = true;
            }


            if (

                key ===
                    "arrowleft" ||

                key === "a"

            ) {

                keys.left = true;
            }


            if (

                key ===
                    "arrowright" ||

                key === "d"

            ) {

                keys.right = true;
            }


            if (
                key === "shift" ||
                key === "e"
            ) {

                keys.shield =
                    true;
            }


            if (
                key === "q"
            ) {

                keys.missile =
                    true;
            }


            if (
                key === " "
            ) {

                keys.fire =
                    true;

                initAudio();
            }


            if (
                key === "p" &&
                gameState ===
                    STATE.PLAYING
            ) {

                paused =
                    !paused;


                sound(

                    paused
                        ? 200
                        : 500,

                    0.08,

                    "square",

                    0.025

                );
            }

        }
    );


    window.addEventListener(
        "keyup",
        event => {

            const key =
                event.key.toLowerCase();


            if (

                key ===
                    "arrowup" ||

                key === "w"

            ) {

                keys.up =
                    false;
            }


            if (

                key ===
                    "arrowdown" ||

                key === "s"

            ) {

                keys.down =
                    false;
            }


            if (

                key ===
                    "arrowleft" ||

                key === "a"

            ) {

                keys.left =
                    false;
            }


            if (

                key ===
                    "arrowright" ||

                key === "d"

            ) {

                keys.right =
                    false;
            }


            if (
                key === "shift" ||
                key === "e"
            ) {

                keys.shield =
                    false;
            }


            if (
                key === "q"
            ) {

                keys.missile =
                    false;
            }


            if (
                key === " "
            ) {

                keys.fire =
                    false;
            }

        }
    );


    /* =====================================================
       CONTROL FIRE MÓVIL
       ===================================================== */

    function setupHoldButton(
        button,
        keyName
    ) {

        if (!button) {
            return;
        }


        const press = event => {

            event.preventDefault();

            initAudio();

            keys[keyName] =
                true;
        };


        const release = event => {

            event.preventDefault();

            keys[keyName] =
                false;
        };


        button.addEventListener(
            "touchstart",
            press,
            {
                passive: false
            }
        );


        button.addEventListener(
            "touchend",
            release,
            {
                passive: false
            }
        );


        button.addEventListener(
            "touchcancel",
            release,
            {
                passive: false
            }
        );


        button.addEventListener(
            "mousedown",
            press
        );


        button.addEventListener(
            "mouseup",
            release
        );


        button.addEventListener(
            "mouseleave",
            release
        );
    }


    function setupFireButton() {

        setupHoldButton(
            fireButton,
            "fire"
        );

        setupHoldButton(
            missileButton,
            "missile"
        );

        setupHoldButton(
            shieldButton,
            "shield"
        );
    }


    setupFireButton();


    /* =====================================================
       CONTROL TÁCTIL PARA MOVER
       ===================================================== */

    let touchStartY = null;

    /*
     * Antes solo se seguía el eje Y. En modo combate la nave
     * también se mueve en horizontal (izquierda/derecha) y
     * por táctil era imposible esquivar de lado a lado.
     */
    let touchStartX = null;


    canvas.addEventListener(
        "touchstart",
        event => {

            if (
                gameState !==
                STATE.PLAYING
            ) {
                return;
            }


            if (
                event.touches.length !==
                1
            ) {
                return;
            }


            touchStartY =
                event.touches[0]
                    .clientY;

            touchStartX =
                event.touches[0]
                    .clientX;

        },
        {
            passive: true
        }
    );


    canvas.addEventListener(
        "touchmove",
        event => {

            if (
                gameState !==
                STATE.PLAYING
            ) {
                return;
            }


            if (
                touchStartY ===
                null
            ) {
                return;
            }


            const currentY =
                event.touches[0]
                    .clientY;

            const currentX =
                event.touches[0]
                    .clientX;


            const difference =
                currentY -
                touchStartY;


            if (
                Math.abs(
                    difference
                ) > 8
            ) {

                if (
                    difference < 0
                ) {

                    player.y -=
                        player.speed *
                        0.025;

                } else {

                    player.y +=
                        player.speed *
                        0.025;
                }


                player.y =
                    clamp(

                        player.y,

                        55,

                        HEIGHT - 55

                    );


                touchStartY =
                    currentY;
            }


            if (
                combatMode &&
                touchStartX !== null
            ) {

                const differenceX =
                    currentX -
                    touchStartX;

                if (
                    Math.abs(
                        differenceX
                    ) > 8
                ) {

                    if (
                        differenceX < 0
                    ) {

                        player.x -=
                            player.speed *
                            0.025;

                    } else {

                        player.x +=
                            player.speed *
                            0.025;
                    }


                    player.x =
                        clamp(

                            player.x,

                            50,

                            WIDTH - 50

                        );


                    touchStartX =
                        currentX;
                }
            }

        },
        {
            passive: true
        }
    );


    canvas.addEventListener(
        "touchend",
        () => {

            touchStartY =
                null;

            touchStartX =
                null;

        },
        {
            passive: true
        }
    );


    /* =====================================================
       RESPONSIVE
       (se reutiliza para "resize" y "orientationchange":
       algunos navegadores móviles no disparan resize de
       forma confiable al rotar la pantalla)
       ===================================================== */

    function handleViewportChange() {

        setAppViewportHeight();


        /*
         * Vuelve a aplicar la resolución del canvas por si
         * el navegador cambió de pantalla (raro, pero barato
         * de repetir).
         */

        applyCanvasResolution();


        if (
            gameState ===
            STATE.PLAYING
        ) {

            if (isTouchDevice) {

                fireButton.classList.remove(
                    "hidden"
                );

                missileButton.classList.remove(
                    "hidden"
                );

                if (combatMode) {

                    shieldButton.classList.remove(
                        "hidden"
                    );

                } else {

                    shieldButton.classList.add(
                        "hidden"
                    );
                }

            } else {

                fireButton.classList.add(
                    "hidden"
                );

                missileButton.classList.add(
                    "hidden"
                );

                shieldButton.classList.add(
                    "hidden"
                );
            }
        }
    }


    window.addEventListener(
        "resize",
        handleViewportChange
    );


    window.addEventListener(
        "orientationchange",
        handleViewportChange
    );


    /*
     * En iOS Safari, mostrar/ocultar la barra de direcciones
     * dispara el evento de visualViewport de forma más fiable
     * que "resize". Si existe, lo aprovechamos también.
     */

    if (window.visualViewport) {

        window.visualViewport.addEventListener(
            "resize",
            handleViewportChange
        );
    }


    /* =====================================================
       PAUSA AUTOMÁTICA AL CAMBIAR DE APP / PESTAÑA
       (evita golpes "injustos" mientras el juego está en
       segundo plano en el celular, y ahorra batería)
       ===================================================== */

    document.addEventListener(
        "visibilitychange",
        () => {

            if (
                gameState !==
                STATE.PLAYING
            ) {

                return;
            }

            if (document.hidden) {

                paused = true;

            } else {

                paused = false;

                /*
                 * Evita un salto grande de dt en el primer
                 * frame al volver.
                 */

                lastTime = 0;
            }
        }
    );


    /* =====================================================
       ACTUALIZAR JUEGO
       ===================================================== */

    function update(dt) {

        if (
            gameState ===
            STATE.TUTORIAL
        ) {

            updateTutorial(dt);

            return;
        }


        if (
            gameState !==
            STATE.PLAYING
        ) {

            return;
        }


        if (paused) {

            return;
        }


        gameTime +=
            dt;


        if (
            combatBannerTimer >
            0
        ) {

            combatBannerTimer -=
                dt;
        }


        /* Fondo */

        updateStars(dt);


        /* Jugador */

        updatePlayer(dt);


        /* Balas */

        updateBullets(dt);


        if (combatMode) {

            /* Jefe */

            updateBoss(dt);

            updateBossBullets(dt);

        } else {

            /* Enemigos */

            updateEnemies(dt);


            /* Meteoritos */

            updateMeteors(dt);


            /* Power-ups */

            updatePowerUps(dt);
        }


        /* Partículas */

        updateParticles(dt);


        /* Colisiones */

        handleCollisions();


        if (combatMode) {

            handleBossCollisions();
        }


        /* Dificultad */

        updateDifficulty(dt);


        /* Distancia */

        updateScore(dt);


        if (!combatMode) {

            checkLevelProgress();
        }


        if (!combatMode) {

            /* =================================
               SPAWN DE METEORITOS
               (único obstáculo del recorrido;
               las naves solo aparecen como jefes)
               ================================= */

            meteorTimer +=
                dt;


            if (
                meteorTimer >=
                meteorSpawnRate
            ) {

                meteorTimer = 0;


                spawnMeteor();


                /*
                 * Con el tiempo puede
                 * aparecer una pequeña
                 * formación de meteoritos.
                 */

                if (
                    gameTime > 20 &&
                    Math.random() <
                        0.25
                ) {

                    setTimeout(
                        () => {

                            if (
                                gameState ===
                                    STATE.PLAYING &&
                                !combatMode &&
                                !paused
                            ) {

                                spawnMeteor();
                            }

                        },
                        350
                    );
                }
            }


            /* =================================
               SPAWN DE POWER UPS
               ================================= */

            powerUpTimer +=
                dt;


            if (
                powerUpTimer >=
                12
            ) {

                powerUpTimer = 0;


                if (
                    Math.random() <
                    0.65
                ) {

                    spawnPowerUp();
                }
            }
        }


        updateHUD();
    }


    /* =====================================================
       RENDER
       ===================================================== */

    function render() {

        ctx.clearRect(
            0,
            0,
            WIDTH,
            HEIGHT
        );


        /* Fondo */

        drawBackground();


        /* Partículas */

        drawParticles();


        /* Meteoritos */

        for (
            const meteor of
                meteors
        ) {

            drawMeteor(
                meteor
            );
        }


        /* Power-ups */

        drawPowerUps();


        /* Enemigos */

        for (
            const enemy of
                enemies
        ) {

            drawEnemy(
                enemy
            );
        }


        /* Jefe */

        drawBoss();

        drawBossBullets();


        /* Balas */

        drawBullets();


        /* Jugador */

        if (

            gameState ===
                STATE.PLAYING ||

            gameState ===
                STATE.GAMEOVER

        ) {

            drawPlayer();

            drawShieldEffect();
        }


        /* HUD */

        if (
            gameState ===
            STATE.PLAYING
        ) {

            drawCanvasHUD();
        }
    }


    /* =====================================================
       GAME LOOP
       ===================================================== */

    function gameLoop(
        timestamp
    ) {

        if (!lastTime) {

            lastTime =
                timestamp;
        }


        let dt =
            (
                timestamp -
                lastTime
            ) /
            1000;


        lastTime =
            timestamp;


        /*
         * Evita saltos grandes
         * cuando se cambia de pestaña.
         */

        dt =
            Math.min(
                dt,
                0.05
            );


        trackPerformance(dt);


        update(dt);

        render();


        requestAnimationFrame(
            gameLoop
        );
    }


    /* =====================================================
       INICIALIZACIÓN
       ===================================================== */

    applyCanvasResolution();

    createStars();

    updateHUD();

    selectShip(0);


    requestAnimationFrame(
        gameLoop
    );

})();
