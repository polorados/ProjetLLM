Projet LLM Plugin google chrome


propal d'archi 

chrome-journal/
├── manifest.json
├── src/
│   ├── background.js       # Browser event listeners
│   ├── collector/
│   │   ├── history.js      # Browsing history
│   │   └── tabs.js         # Tab activity
│   ├── storage/
│   │   └── database.js     # Local persistence
│   ├── analysis/
│   │   ├── features.js     # Compute usage statistics
│   │   └── profiler.js     # Infer user needs
│   ├── recommendations/
│   │   ├── catalogue.json  # Extension catalogue
│   │   ├── matcher.js      # Match needs to extensions
│   │   └── ranker.js       # Rank recommendations
│   └── ui/
│       ├── popup.html
│       └── popup.js
└── tests/
