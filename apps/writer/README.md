# writer

To install dependencies:

```bash
bun install
```

To run:

```bash
WRITER_STREAM_NAME=monitor:jobs:reports \
CONSUMER_GROUP_NAME=db-writers \
CONSUMER_NAME=writer-1 \
PUSH_THRESHOLD=50 \
bun start
```

This project was created using `bun init` in bun v1.3.9. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
