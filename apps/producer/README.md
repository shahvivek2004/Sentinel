# producer

To install dependencies:

```bash
bun install
```

To run:

```bash
STORE_NAME=monitor_ticks STREAM_NAME=monitor:jobs:queued bun run producer.ts
```

This project was created using `bun init` in bun v1.3.9. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
