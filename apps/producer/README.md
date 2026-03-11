# producer

To install dependencies:

```bash
bun install
```

To run:

```bash
STORE_NAME=monitor:scheduler \
STREAM_NAME=monitor:jobs:queued \
HASH_STORE_NAME=monitor:cache \
bun start
```

This project was created using `bun init` in bun v1.3.9. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
