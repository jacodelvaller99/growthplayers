# 🧪 PLAN DE TESTING — Lifeflow Onboarding

## 📱 Servidor Expo

```bash
npm start
# Presiona: w (web) | a (Android) | i (iOS)
```

**Acceso:**
- Web: http://localhost:8081 (después del QR)
- Mobile: Escanea el QR con Expo Go app

---

## ✅ CHECKLIST DE TESTING

### **Splash Screen (5 segundos)**
```
[ ] Animación chevrons aparecen suavemente
[ ] "LIFEFLOW" texto aparece con scale
[ ] "BY GROWTH PLAYERS" subtitle fade in
[ ] Progress bar llena gradualmente
[ ] Auto-navega a login después de 5s
```

### **Login Screen**
```
[ ] Design correcto: Rich Black (#01191D) bg
[ ] Chevrons ↑↑ en la parte superior
[ ] Campos de email/password funcional
[ ] Campos muestran placeholder correcto
[ ] Focus state: border mint (#AEFEF0)
[ ] Botón "INGRESAR AL PROTOCOLO" deshabilitado sin datos
[ ] Botón enabled cuando hay email + password
[ ] OAuth buttons (Apple, Google) presionables
[ ] "¿No tienes cuenta? REGÍSTRATE" link funciona
```

**Test:**
```
Email: test@example.com
Password: password123

→ Con mock data, debería entrar directo sin validar
```

### **Register Screen**
```
[ ] 3 campos: email, password, confirm password
[ ] Validación password < 8 caracteres (error rojo)
[ ] Las contraseñas no coinciden (error rojo)
[ ] Botón "REGISTRARSE" presionables
[ ] Link "¿Ya tienes cuenta? INICIA SESIÓN"
```

---

## 🎯 **ONBOARDING COMPLETO**

### **Step 1: Tu Avatar de Éxito**

**Elementos visuales:**
```
[ ] Double chevrons (↑↑) arriba del título
[ ] "PASO 1 DE 3" con línea divisoria
[ ] "Tu Avatar de Éxito" h2 en mint
[ ] Subtítulo explicativo
[ ] 3 input fields:
    - Tu Nombre
    - Tu Objetivo en 90 Días
    - Quién Serás Cuando Lo Logres
[ ] Progress bar: 1/3 (⬛⬜⬜)
[ ] Botón "ACTIVAR MI AVATAR →"
```

**Validación:**
```
[ ] Campo vacío → fondo rojo #ef4444
[ ] Campo vacío → border rojo
[ ] Al llenar → estado normal
[ ] Sin datos → botón deshabilitado (opacity 0.45)
[ ] Con datos → botón activado
[ ] Click → guarda en Zustand → navega a step2
```

**Test data:**
```
Nombre: Alex
Objetivo: Lanzar mi negocio en 90 días
Descripción: Emprendedor enfocado en crecimiento sostenible
```

---

### **Step 2: Diagnóstico Polaris** ⭐ NUEVO

**Pregunta 1: ¿Qué es lo que más te frustra?**
```
[ ] Texto pregunta: "¿Qué es lo que más te frustra?"
[ ] Subtítulo: "Elige tu dolor principal"
[ ] 4 Chips seleccionables:
    - "No avanzo aunque me esfuerzo"
    - "Me falta claridad, no sé qué hacer"
    - "Sé qué hacer pero no lo ejecuto"
    - "Me frena el dinero o el miedo"
[ ] Chip inactivo: bg #0D2B30, border mint
[ ] Chip activo: bg #AEFEF0 (mint), text #01191D
[ ] Check icon aparece en seleccionado
[ ] Botón "SIGUIENTE PREGUNTA →" aparece
[ ] Click botón → navega a pregunta 2 (slide suave)
```

**Pregunta 2: ¿Qué cambiaría si todo fuera perfecto?**
```
[ ] Igual UI que pregunta 1
[ ] 4 opciones:
    - Libertad financiera real
    - Ser referente en mi industria
    - Tiempo con mi familia sin culpa
    - Impacto masivo en otros
[ ] Navegación botón atrás funciona
```

**Pregunta 3: ¿Cuál es tu mayor enemigo interno?**
```
[ ] 4 opciones:
    - La procrastinación
    - El perfeccionismo
    - El miedo al qué dirán
    - La falta de disciplina
```

**Pregunta 4: Cuando piensas en invertir en ti mismo...**
```
[ ] 4 opciones:
    - Es lo mejor que puedo hacer
    - Necesito ver resultados primero
    - Me da miedo no ver retorno
    - No tengo el dinero ahora mismo
[ ] Botón cambia a "VER MI RUEDA →"
[ ] Click → guarda PolarisProfile en AsyncStorage + Zustand
[ ] Navega a step3-wheel
```

**Progress bar:**
```
[ ] Línea horizontal debajo del header
[ ] Relleno 25% → Pregunta 1
[ ] Relleno 50% → Pregunta 2
[ ] Relleno 75% → Pregunta 3
[ ] Relleno 100% → Pregunta 4
```

---

### **Step 3: Rueda de la Vida** ⭐ SLIDERS

**Header:**
```
[ ] "PASO 3 DE 4"
[ ] "Tu Rueda de la Vida" title
[ ] Subtítulo: "Evalúa cada pilar con un movimiento suave del slider"
[ ] Progress bar: 75% (⬛⬛⬛⬜)
```

**Summary Card:**
```
[ ] "PROMEDIO GENERAL: X/10" (lado izquierdo)
[ ] "PILAR DÉBIL: Negocio" (lado derecho, rojo)
[ ] Se actualiza en TIEMPO REAL al mover sliders
```

**Sliders (8 pilares):**
```
Para cada pilar (Fe, Finanzas, Salud, Familia, Mente, Negocio, Impacto, Legado):

[ ] Label: "✨ Fe" etc.
[ ] Slider horizontal
    - Rango: 0-10
    - Step: 1 (números enteros)
    - Track color: pillar color (púrpura, verde, rojo, etc.)
    - Thumb color: mint (#AEFEF0)
[ ] Valor mostrado: "5/10" (derecha)
[ ] Progress bar debajo del slider
    - Ancho proporcional al valor
    - Color del pilar
[ ] Al mover slider → actualiza valor en tiempo real
[ ] Summary card (promedio, pilar débil) se actualiza
```

**Alert Box:**
```
[ ] Fondo: rgba(174, 254, 240, 0.15)
[ ] Border: mint 1.5px
[ ] Icono: ⚠️
[ ] "PRIORIDAD DE DESARROLLO"
[ ] Nombre pilar débil (rojo)
[ ] "Tu Mentor Polaris enfatizará el crecimiento en esta área..."
```

**Botones:**
```
[ ] "ACTIVAR MI PROTOCOLO →" (primario, mint)
    - Presionarlo → guarda wheel en Zustand
    - Navega a step4-welcome
[ ] "SALTAR" (ghost, outline)
    - Presionarlo → también navega a step4-welcome
```

**Test sliders:**
```
Mueve cada slider a diferentes valores:
- Fe: 8
- Finanzas: 3 (debe ser más débil)
- Salud: 7
- Familia: 6
- Mente: 5
- Negocio: 2 (PILAR MÁS DÉBIL)
- Impacto: 6
- Legado: 5

→ Promedio debe ser ~5
→ Pilar débil debe mostrar "🚀 Negocio"
```

---

### **Step 4: Bienvenida**

```
[ ] "Lifeflow" logo grande
[ ] Mensaje de bienvenida personalizado
[ ] Particles animadas de fondo
[ ] Botón "COMENZAR MI PROTOCOLO →"
[ ] Auto-navega a /(tabs)/bitacora después de 5 segundos
```

---

## 🐛 **ERRORES ESPERADOS (CORREGIR SI APARECEN)**

| Error | Causa | Solución |
|-------|-------|----------|
| Slider no responde | @react-native-community/slider no instalado | `npm install @react-native-community/slider` |
| "Cannot find module 'types/polaris'" | TypeScript import error | `npm run build` o limpiar cache |
| Progress bar no se anima | Reanimated issue | Restart Expo |
| AsyncStorage error | Storage no inicializado | Reinicia app |
| Navegación no funciona | Router config | Verifica /(auth)/onboarding/_layout.tsx |

---

## 📊 **DATOS GUARDADOS DESPUÉS DEL ONBOARDING**

**Zustand Stores:**
```typescript
useAuthStore.user = {
  nombre: "Alex",
  objetivo_90_dias: "...",
  avatar_descripcion: "...",
  // ... otros campos
}

usePolarisStore.profile = {
  dolor: "esfuerzo",
  deseo: "libertad",
  patron: "procrastinacion",
  objecion: "dinero"
}

useWheelStore.wheel = {
  fe: 8,
  finanzas: 3,
  // ... todos los pilares
}

useJournalStore.streak = 7 (del mock)
```

**AsyncStorage:**
```
"polarisProfile" → JSON string del PolarisProfile
```

---

## ✨ **CHECKLIST FINAL**

```
VISUAL:
  [ ] Colores correctos (Rich Black, Mint, Teal)
  [ ] Fonts: SpaceGrotesk cargadas
  [ ] Spacing consistente
  [ ] Animations suaves (no lag)

FUNCIONALIDAD:
  [ ] Validación fields funciona
  [ ] Navegación entre steps
  [ ] Sliders responden
  [ ] Guardado de datos
  [ ] Auto-navegación final

PERFORMANCE:
  [ ] Sin errores en console
  [ ] Sin memory leaks
  [ ] Transiciones suaves
  [ ] Carga rápida
```

---

## 🎬 **QUICK START VIDEO FLOW**

1. App inicia → Splash 5s
2. Login automático con mock data
3. Splash completo → Step 1 Avatar
4. Llena: "Alex", "Lanzar negocio", "Emprendedor..."
5. Click "ACTIVAR MI AVATAR" → Step 2 Diagnóstico
6. Selecciona en orden: esfuerzo, libertad, procrastinación, dinero
7. Click "VER MI RUEDA" → Step 3 Wheel
8. Ajusta sliders (Fe:8, Finanzas:3, etc)
9. Click "ACTIVAR MI PROTOCOLO" → Step 4 Welcome
10. Auto-navega a bitacora (main app) ✅

