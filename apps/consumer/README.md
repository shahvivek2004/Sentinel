# consumer

To install dependencies:

```bash
bun install
```

To run:

```bash
STREAM_NAME=monitor:jobs:queued REGION_NAME=asia WORKER_NAME=worker-1 bun run consumer.ts
```

This project was created using `bun init` in bun v1.3.9. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
