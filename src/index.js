const { Client, GatewayIntentBits, ActivityType, Events } = require("discord.js");
const { config, validateConfig } = require("./config");
const logger = require("./utils/logger");
const scheduler = require("./services/scheduler");

// Validar configuración antes de iniciar
try {
    validateConfig();
} catch (error) {
    logger.error(`Error de configuración: ${error.message}`);
    process.exit(1);
}

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, async () => {
    logger.success(`👑 ${client.user.tag} conectado correctamente`);

    // Establecer actividad personalizada
    client.user.setActivity("Vigilando al Steve 👀", {
        type: ActivityType.Watching,
    });

    // Iniciar la comprobación puntual inicial
    await scheduler.start(client);
});

client.on("error", (error) => {
    logger.error(`Error del cliente Discord: ${error.message}`);
});

process.on("unhandledRejection", (error) => {
    logger.error(`Promesa rechazada no controlada: ${error.message}`);
});

process.on("SIGINT", () => {
    logger.info("Recibida señal de terminación...");
    scheduler.stop();
    client.destroy();
    process.exit(0);
});

client.login(config.discord.token).catch((error) => {
    logger.error(`No se pudo iniciar sesión en Discord: ${error.message}`);
    process.exit(1);
});
