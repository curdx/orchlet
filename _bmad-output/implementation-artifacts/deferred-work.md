# Deferred Work

## Golutra Chat Dispatch Parity

- Full Golutra-style durable chat outbox and per-terminal semantic batcher remain out of scope for this bugfix. Current dispatch writes are serialized by the terminal runtime and queued by member availability, but there is no long-running worker that waits for CLI command completion before accepting the next semantic prompt for the same terminal.
