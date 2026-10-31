# SteveBot

Bot de Discord que notifica directos de Kick y videos nuevos de YouTube, y permite publicar paneles de autoroles.

## Panel de autoroles

Un administrador puede ejecutar `/autoroles` y completar:

- **canal**: canal de texto donde publicar el panel.
- **titulo**: título que aparecerá en el embed.
- **asociaciones**: una pareja de emoji y rol por línea.

Ejemplo:

```text
🎮 = @Gamers
🔔 = 123456789012345678
```

Puedes indicar el rol por mención, nombre exacto o ID. Los emojis personalizados deben escribirse con su formato, por ejemplo `<:juego:123456789012345678>`. Al reaccionar, el bot asigna el rol; al quitar la reacción, lo retira.

El bot necesita **Administrar roles** y permisos para ver el canal, enviar mensajes, insertar enlaces, añadir reacciones y leer el historial. Su rol más alto debe estar por encima de todos los roles que se ofrezcan en el panel. Las asociaciones se guardan en `data/autoroles.json` para que sigan funcionando tras reiniciar.

El comando se registra automáticamente en los servidores donde está el bot. Si no aparece, verifica que la invitación del bot incluya el ámbito `applications.commands`.
