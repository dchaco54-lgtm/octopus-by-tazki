# OCTOPUS - DESIGN SYSTEM & UX GUIDELINES

Este documento define las reglas obligatorias de diseno, UX y estructura para todo el sistema Octopus.

Cualquier desarrollo nuevo debe respetar estas reglas.
No son sugerencias, son estandares.

---

## 1. FILOSOFIA DEL PRODUCTO

Octopus es un ERP/CRM interno.

Debe ser:

- Operativo
- Rapido
- Claro
- Sin friccion
- Pensado para uso diario intensivo

Inspiracion principal:

- Odoo v16

---

## 2. PRINCIPIOS UX (NO NEGOCIABLES)

### 2.1 No scroll innecesario

- El usuario NO debe bajar constantemente
- Informacion clave visible en pantalla

### 2.2 Edicion fluida

- Un solo boton "Editar"
- Activa modo edicion global
- No recargar pagina
- No cambiar de pestana

### 2.3 Informacion agrupada

- Evitar formularios largos
- Usar grids (2 columnas)

### 2.4 Contexto siempre visible

- Logs/Actividad SIEMPRE visibles (lado derecho)
- Tabs sticky (fijos)

---

## 3. ESTRUCTURA BASE DE TODAS LAS VISTAS

### Layout obligatorio

IZQUIERDA:

- Contenido principal
- Tabs
- Formularios

DERECHA:

- Panel de actividad/log
- Scroll independiente

---

## 4. HEADER DE ENTIDADES (CLIENTES, ETC)

Debe contener:

- Nombre
- Identificador (RUT)
- Estado (badge)
- Boton Editar / Guardar

Reglas:

- No sobrecargar
- No duplicar info

---

## 5. MODO EDICION

### Comportamiento

- Boton "Editar" activa TODO
- Inputs editables
- Selects habilitados
- Toggles visibles

Debe incluir:

- Guardar
- Cancelar

NO:

- Recargar pagina
- Cambiar pestana
- Perder scroll

---

## 6. TABS

- Compactos
- Sticky
- Sin exceso de altura
- Navegacion fluida

---

## 7. FORMULARIOS

### SIEMPRE

- Grid de 2 columnas
- Espaciado reducido
- Agrupacion logica

### NUNCA

- Formularios largos verticales
- Campos duplicados
- Secciones gigantes

---

## 8. SIDEBAR

Debe ser tipo Odoo:

- Icono + nombre
- Todos los modulos visibles
- Navegacion clara

Cambios obligatorios:

- Quitar logo grande
- Mostrar "Octopus"
- Iconos consistentes

---

## 9. LOG / ACTIVIDAD

Siempre:

- Lado derecho
- Visible sin scroll
- Independiente del contenido

Nunca:

- Abajo del todo

---

## 10. CONSISTENCIA ENTRE MODULOS

TODOS los modulos deben:

- Usar el mismo layout
- Mantener misma logica de edicion
- Mantener misma estructura visual

Ejemplo:

- Clientes
- Contactos
- Facturacion
- Suscripciones

### Implementacion en codigo

Este patron no debe quedar solo como criterio visual.

Debe mantenerse tambien en los componentes compartidos del sistema:

- `components/layout/erp-layout-contract.ts`
- `components/layout/app-sidebar.tsx`
- `components/layout/protected-shell.tsx`
- shells de detalle como `components/clients/client-detail-shell.tsx`

Si un modulo nuevo se desvía del patron ERP/Odoo, debe corregirse para volver a esta base.

---

## 11. COLORES Y ESTILO

Usar siempre:

- Paleta actual del proyecto
- Bordes suaves
- Cards limpias
- Diseno minimalista

Evitar:

- Colores nuevos sin sentido
- Componentes distintos entre modulos

---

## 12. NOMENCLATURA

Ser consistente:

- Espanol
- Claro
- Operativo

Ejemplo:

- "Facturacion"
- "Cliente pagador"
- "Modelo de facturacion"

---

## 13. PERFORMANCE UX

Debe sentirse:

- Rapido
- Ligero
- Sin recargas innecesarias

---

## 14. REGLA DE ORO

Antes de implementar cualquier cosa:

Preguntarse:

> "¿Esto reduce friccion o la aumenta?"

Si aumenta -> no implementar

---

## 15. USO DE ESTE DOCUMENTO

Cada vez que se cree o modifique un modulo:

1. Leer este documento
2. Validar cumplimiento
3. Implementar

---

## 16. OUTPUT ESPERADO EN DESARROLLO

Cada implementacion debe:

- Respetar layout
- Mantener consistencia
- No romper UX existente
- Ser coherente con este documento

---

Este documento es la base del sistema Octopus.
