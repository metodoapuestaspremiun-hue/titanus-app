# 🎨 GUÍA MAESTRA DE BRANDING & IDENTIDAD VISUAL: ALL-crm

Esta documentación detalla todos los assets, paleta cromática, tipografías, configuración PWA y el checklist exacto para aplicar un nuevo perfil/marca personalizada (White-Label / Single-Tenant).

---

## 1. 📁 Estructura de Archivos Gráficos y Assets

Todos los recursos gráficos del sistema residen en la carpeta `public/`:

```
public/
├── branding/
│   ├── app_icon.png       # Ícono PWA cuadrado (512x512 y 192x192 px, sin esquinas redondeadas)
│   ├── favicon.ico        # Favicon del navegador (32x32 / 16x16 px)
│   ├── logo_main.png      # Logotipo principal con isotipo y texto (Fondo oscuro)
│   └── logo_negative.png  # Variante negativa o monocromática para fondos claros/contrastes
├── favicon.ico            # Favicon raíz de fallback
├── logo_main.png          # Logo de acceso directo
└── manifest.json          # Manifiesto PWA de instalación en móviles y escritorio
```

### Especificaciones de Archivos:
- **`app_icon.png`**: Formato PNG transparente, resolución recomendada 512×512 px. Se usa para la instalación en pantallas de inicio Android/iOS como Web App independiente.
- **`logo_main.png`**: Logotipo en versión horizontal o combinada (ancho recomendado ~400–600 px, altura ~120–160 px), diseñado para contrastar sobre fondos oscuros (`#03080F`).
- **`logo_negative.png`**: Variante para contrastes invertidos o impresión/comprobantes.

---

## 2. 🎨 Paleta Cromática (Design System Tokens)

El sistema utiliza una estética **Tactical Dark Cyberpunk / Fintech** definida en [globals.css](file:///d:/Abel%20paginas/GImnasios%20Fideliz/Proyecto/src/app/globals.css):

### Colores Base & UI:
| Token CSS | Hex / RGBA | Uso en el Sistema |
|---|---|---|
| `--bg-app` | `#03080F` | Fondo principal de la aplicación con degradado radial |
| `--bg-card` | `#05101C` | Fondo de tarjetas tácticas con backdrop blur (`tactical-card`) |
| `--border-card`| `rgba(0, 245, 212, 0.15)` | Bordes sutiles con resplandor cian |
| `--text-main` | `#FFFFFF` | Textos primarios y encabezados |
| `--text-muted`| `#8AA4C4` | Textos secundarios, descripciones y placeholders |

### Acentos de Acción & Estado:
| Token CSS | Hex | Rol y Significado |
|---|---|---|
| `--accent-cyan` | `#00F5D4` | **Color Primario de Marca:** Botones principales, QR scan, bordes activos, switchers |
| `--accent-teal` | `#00E5FF` | Gradientes de realce junto con el cian (`text-gradient-cyan`) |
| `--accent-gold` | `#F59E0B` | **Fintech & VIP:** Cashback acumulado, membresías Oro/Platino, podio Top 1 |
| Emerald / Green | `#10B981` | Estados de éxito, WhatsApp conectado, canjes aprobados |

---

## 3. ✍️ Tipografías Oficiales

Configuradas mediante Google Fonts en [layout.tsx](file:///d:/Abel%20paginas/GImnasios%20Fideliz/Proyecto/src/app/layout.tsx):

1. **Montserrat (SemiBold 600, Bold 700)**:
   - Clase: `.font-display` y `.font-title`
   - Uso: Títulos de secciones, nombres de módulos, botones tácticos (`letter-spacing: 0.04em - 0.06em`).
2. **Inter (Regular 400, Medium 500)**:
   - Clase: `font-sans` (por defecto en todo el `body`)
   - Uso: Textos corridos, tablas, inputs, balances, drawers.
3. **Bebas Neue (Regular 400)**:
   - Clase: `.font-number`
   - Uso: Cifras de impacto, métricas numéricas grandes, montos de cashback y porcentajes.

---

## 4. 📱 Configuración PWA (`public/manifest.json`)

Para que la app muestre la identidad de la marca al instalarse en Android / iOS / Chrome:

```json
{
  "name": "ALL-crm — Fidelización & Retención",
  "short_name": "ALL-crm",
  "description": "Plataforma Inteligente de Fidelización & Retención",
  "start_url": "/login",
  "display": "standalone",
  "background_color": "#02050B",
  "theme_color": "#00F5D4",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/branding/app_icon.png?v=3",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/branding/app_icon.png?v=3",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

---

## 5. 🛠️ Checklist: Cómo Personalizar para un Nuevo Perfil / Cliente

Cuando vayas a crear un nuevo despliegue o marca personalizada (por ejemplo, para un gimnasio específico):

1. **Reemplazar Archivos Gráficos:**
   - Colocar el nuevo ícono de 512×512 en `public/branding/app_icon.png`.
   - Colocar el logotipo en `public/branding/logo_main.png`.
   - Colocar el favicon en `public/branding/favicon.ico` y `public/favicon.ico`.

2. **Ajustar Manifiesto (`public/manifest.json`):**
   - Cambiar `"name"` y `"short_name"` por el nombre de la empresa/gimnasio.
   - Si el color corporativo cambia, actualizar `"theme_color"` (por defecto `#00F5D4`).

3. **Ajustar Metadatos en (`src/app/layout.tsx`):**
   - Actualizar `title` y `description` en el objeto `metadata`.
   - Actualizar `themeColor` en el objeto `viewport`.

4. **Ajustar Paleta Cromática (Opcional si la marca usa otro color primario):**
   - En `src/app/globals.css`:
     - Modificar `--accent-cyan` con el color principal de la marca (ej: `#E11D48` si es rojo, `#3B82F6` si es azul).
     - Modificar `--border-card` para que el resplandor coincida con el nuevo tono.

