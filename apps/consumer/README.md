# consumer

To install dependencies:

```bash
bun install
```

To run:

```bash
WRITER_STREAM_NAME=monitor:reports \
PRODUCER_STREAM_NAME=monitor:jobs:queued \
REGION_ID=asia-(enter uuid here) \
WORKER_NAME=worker-1 \
bun start
```

This project was created using `bun init` in bun v1.3.9. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
