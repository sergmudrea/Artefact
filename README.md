# Artefact

artifact/
├── package.json
├── tsconfig.json
├── docker-compose.yml
├── .env
├── README.md
├── docs/
│   ├── manifest.md          # Философия проекта
│   └── api.md               # Документация для расширения
├── kernel/
│   ├── core/
│   │   ├── Cerberus.ts      # Трехголовое ядро (30k строк)
│   │   ├── Nexus.ts         # Точка синхронизации голов
│   │   └── Void.ts          # Управление памятью и сборщик мусора
│   ├── hive/
│   │   ├── Mutator.ts       # Генератор мутаций кода
│   │   ├── Selector.ts      # Естественный отбор мутаций
│   │   └── Arena.ts         # Песочница для тестирования
│   └── echo/
│       ├── Recaller.ts      # Воспроизведение опыта
│       └── Forger.ts        # Создание ложных воспоминаний (защита)
├── layers/
│   ├── intent/
│   │   └── Interpreter.ts   # Перевод намерений в задачи
│   ├── vision/
│   │   ├── ChaosUI.ts       # WebGL/Three.js визуализация
│   │   └── MangaGen.ts      # Генерация комиксов об архитектуре
│   └── audio/
│       └── SiliconSymphony.ts # Превращение метрик в музыку
├── adapters/
│   ├── cuda/
│   │   └── TensorEngine.cu  # 10k строк CUDA
│   ├── opencl/
│   │   └── Kernel.cl        # 5k строк OpenCL
│   └── cpu/
│       └── AVX512.cpp       # 5k строк ассемблерных интринсиков
├── sandbox/
│   ├── Dockerfile           # Изолированная среда для мутаций
│   └── monitor.sh           # Наблюдатель за побегом кода
└── ui/
    ├── public/
    │   └── index.html
    └── src/
        ├── App.tsx          # Интерфейс для общения с Артефактом
        └── ChaosRenderer.tsx # Рендер хаоса
