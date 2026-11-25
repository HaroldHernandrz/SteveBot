# SteveBot

Bot de Discord que notifica directos de Kick y videos nuevos de YouTube, y permite publicar paneles de autoroles.

Kick ignora cambios en la hora de inicio reportada mientras el directo sigue activo. Solo marca un stream como finalizado después de al menos 5 minutos y varias respuestas offline válidas; una respuesta online o un error de API reinicia la confirmación. Al iniciar, busca un aviso activo reciente en Discord para recuperarlo. Si Steve ya estaba en directo durante un reinicio y no se encuentra el aviso, lo guarda como referencia sin publicar otro; los directos que comiencen mientras el bot está funcionando sí se anuncian.

## Panel de autoroles

Un administrador puede ejecutar `/autoroles` y completar:

- **canal**: canal de texto donde publicar el panel.
- **titulo**: título que aparecerá en el embed.
- **asociaciones**: una pareja de emoji y rol por línea.
- **texto** (opcional): explicación que aparecerá debajo de las opciones.

El embed usa automáticamente el avatar del bot como miniatura.

Ejemplo:

```text
🎮 = @Gamers
🔔 = 123456789012345678
```

Puedes indicar el rol por mención, nombre exacto o ID. Los emojis personalizados deben escribirse con su formato, por ejemplo `<:juego:123456789012345678>`. Cada persona puede tener solo un rol de ese panel: si intenta elegir otro, el bot no se lo asigna y le avisa por mensaje directo. Al quitar la reacción del rol que tiene, el bot lo retira.

El bot necesita **Administrar roles** y permisos para ver el canal, enviar mensajes, insertar enlaces, añadir reacciones y leer el historial. Su rol más alto debe estar por encima de todos los roles que se ofrezcan en el panel. Las asociaciones se guardan en `data/autoroles.json` para que sigan funcionando tras reiniciar.

El comando se registra automáticamente en los servidores donde está el bot. Si no aparece, verifica que la invitación del bot incluya el ámbito `applications.commands`.
