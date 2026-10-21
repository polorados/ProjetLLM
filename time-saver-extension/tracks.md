# Données collectées

Source : `~/Downloads/download.json`, 597 événements sur environ 44 min, 29 types différents.

| Catégorie | Événements (nombre) | Données utiles |
|---|---|---|
| **Navigation** | `webNavigation.onCommitted` (130), `onBeforeNavigate` (21), `onDOMContentLoaded` (15), `onCompleted` (14), `onHistoryStateUpdated` (12), `onErrorOccurred` (6) | URL, `transitionType` (typed, link, reload…), `frameId`, horodatage |
| **Onglets** | `tabs.onZoomChange` (80), `onUpdated` (73), `onActivated` (22), `onHighlighted` (22), `onCreated` (6), `onRemoved` (5) | id d'onglet, URL, titre, statut de chargement, son |
| **Fenêtres** | `windows.onFocusChanged` (46) | fenêtre active (`-1` = Chrome n'a pas le focus) |
| **Historique** | `history.onVisited` (6) | URL, titre, nombre de visites |
| **Téléchargements** | `downloads.onCreated` / `onChanged` / `onDeterminingFilename` (5) | nom de fichier, type MIME, taille |
| **DOM : souris** | `dom.mouse.scroll` (27), `dom.mouse.click` (7) | URL, balise cliquée |
| **DOM : clavier** | `dom.keyboard.keydown` (19) | balise ciblée (jamais la touche) |
| **DOM : formulaires** | `dom.forms.focusin` (19) | type de champ sélectionné |
| **DOM : visibilité** | `dom.visibility.focus` / `blur` (16 + 16), `visibilitychange` (4) | page au premier plan ou non |
| **DOM : média** | `dom.media.play` (1) | balise (VIDEO, AUDIO) |
| **DOM : performance** | `dom.performance.load` (7) | temps de chargement (ms) |
| **Extension** | `runtime.onInstalled` (9), `runtime.onMessage` (6), `sessions.onChanged` (3) | rechargements de l'extension, messages DOM d'avant le renommage `dom.*` |

## Remarques

- **Taille gonflée par l'export lui-même :** les 3 événements `downloads.*` font environ 5,4 Mo sur les 5,9 Mo du fichier. Ce sont les téléchargements de `exportLogs()`, dont l'URL `data:` contient tout le JSON précédent.
- **Navigation surtout dans des iframes :** 104 des 130 `onCommitted` ont `frameId ≠ 0` (publicités, widgets…). Il faut filtrer sur `frameId === 0` pour obtenir les vraies pages visitées.
- **Bruit :** `tabs.onZoomChange` (80) n'apporte presque rien. Chaque événement DOM stocke aussi tout l'objet `tab` de l'expéditeur, ce qui fait doublon.
- **Jamais vus pendant cette session :** `clipboard.*`, `forms.change` / `submit`, `mouse.dblclick` / `contextmenu`, `idle`, `bookmarks`, `tabGroups`.
