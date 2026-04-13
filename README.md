# App de inventario de bodega

Aplicacion web en HTML, CSS y JavaScript para controlar inventario, registrar ingresos y egresos, revisar historial y exportar un archivo compatible con Excel.

## Archivos necesarios

Para que la app funcione en otro equipo o en GitHub Pages, deben ir juntos estos archivos:

- `index.html`
- `styles.css`
- `app.js`
- `seed-data.js`

Archivos opcionales:

- `extract-seed.ps1` para regenerar la base desde un Excel original.
- `README.md` como guia de uso.

## Uso local

1. Abre `index.html` en el navegador.
2. Registra nuevos items, ingresos y egresos.
3. Usa `Descargar Excel` para exportar la informacion.
4. Usa `Restablecer base` para volver al inventario inicial.

## Datos

- La app guarda los cambios en `localStorage` del navegador.
- El historial inicial parte vacio.
- Si publicas la app, cada persona vera sus propios datos guardados en su navegador.

## Regenerar datos base

Si actualizas el Excel original, puedes volver a generar `seed-data.js` con:

```powershell
.\extract-seed.ps1
```

## Subir a GitHub

1. Crea un repositorio nuevo en GitHub.
2. Sube estos archivos al repositorio:
   `index.html`, `styles.css`, `app.js`, `seed-data.js`, `.nojekyll`, `README.md`
3. Haz el primer commit y push.

Ejemplo desde terminal:

```powershell
git init
git add .
git commit -m "Primera version de app inventario"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git
git push -u origin main
```

## Publicar con GitHub Pages

1. Entra al repositorio en GitHub.
2. Ve a `Settings`.
3. Abre la seccion `Pages`.
4. En `Build and deployment`, elige:
   `Source: Deploy from a branch`
5. Selecciona:
   `Branch: main`
   `Folder: / (root)`
6. Guarda los cambios.
7. GitHub generara un enlace publico para abrir la app.

La URL normalmente quedara asi:

```text
https://TU-USUARIO.github.io/TU-REPOSITORIO/
```
