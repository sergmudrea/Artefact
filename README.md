artifact/
├── package.json
├── tsconfig.json
├── docker-compose.yml
├── .env
├── README.md
├── docs/
│   ├── manifest.md
│   └── api.md
├── kernel/
│   ├── core/
│   │   ├── Cerberus.ts      # The three-headed core
│   │   ├── Nexus.ts         # Synchronization hub
│   │   └── Void.ts          # Memory management & GC
│   ├── hive/
│   │   ├── Mutator.ts       # Code mutation generator
│   │   ├── Selector.ts      # Natural selection
│   │   └── Arena.ts         # Sandbox for testing
│   └── echo/
│       ├── Recaller.ts      # Experience replay
│       └── Forger.ts        # False memory creation (defense)
├── layers/
│   ├── intent/
│   │   └── Interpreter.ts
│   ├── vision/
│   │   ├── ChaosUI.ts
│   │   └── MangaGen.ts
│   └── audio/
│       └── SiliconSymphony.ts
├── adapters/
│   ├── cuda/
│   │   └── TensorEngine.cu
│   ├── opencl/
│   │   └── Kernel.cl
│   └── cpu/
│       └── AVX512.cpp
├── sandbox/
│   ├── Dockerfile
│   └── monitor.sh
└── ui/
    ├── public/
    │   └── index.html
    └── src/
        ├── App.tsx
        └── ChaosRenderer.tsx
