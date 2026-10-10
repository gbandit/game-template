---
name: lobby-setup
description: Use when adding multiplayer lobbies, where players gather, ready up and start a game together. Builds on websocket-setup.
---

# Multiplayer Lobbies

Use this skill when implementing lobby-based multiplayer for the first time: players gather in a lobby, ready up, then start a game together.

This defines the baseline lobby architecture and invariants. Adapt behavior as needed, but keep the invariants intact.

**Prerequisite**: the **websocket-setup** skill has been applied. Lobbies build on its WebSocket connection.

## Architecture

Each lobby runs as an independent tokio task (actor) with its own `mpsc::Receiver<LobbyCmd>`. The WS handler translates `ClientMsg` → `LobbyCmd`, adding server-authoritative identity (client_id, name, sender) so clients can never spoof who they are.

## Required Module Shape

Backend:
1. `backend/src/lobby/messages.rs`: internal commands and public lobby payloads
2. `backend/src/lobby/actor.rs`: single lobby actor loop (`run_lobby`)
3. `backend/src/lobby/manager.rs`: `get_or_create` lifecycle manager
4. Add `lobbies: LobbyManager` to `AppState`
5. Route `lobby.*` WS messages to the relevant lobby actor in WS handler

Frontend:
1. Lobby hook/page using shared WS provider
2. Join on mount/connect, leave on unmount
3. Re-join after reconnect automatically via connection lifecycle

## Database (optional)

Lobbies can be purely in-memory (most games). Add database tables only if you need persistent lobby listing, history, or server restart recovery.

## Required Invariants

1. Trust boundary: `LobbyCmd` is internal and trusted; never deserialize it from network.
2. Identity authority: WS handler injects `client_id` and name from authenticated session, not from client payload.
3. Actor ownership: each lobby actor owns its member state; no shared mutable room state across tasks.
4. Lifecycle cleanup: actor stops when lobby is empty; manager must treat closed senders as stale and recreate actors.
5. Reconnect correctness: stale `Leave` from old socket must not remove a user with an active replacement sender.
6. Broadcast safety: use bounded channels and non-blocking send strategy so one slow client cannot stall the lobby.
7. Ghost-player cleanup: remove members whose sender is closed when broadcasting/sweeping.
8. State healing: broadcast full `lobby.state` snapshots on membership/ready changes.
9. Deterministic ordering: sort players in snapshots (stable order, avoids UI flicker).
10. Event semantics: use `lobby.event` for transient signals (chat, toasts), not authoritative state.
11. Disconnect handling: track current lobby per connection and send `Leave` on disconnect path.

## Message Contract Guidance

1. Client -> server, example: `lobby.join`, `lobby.leave`, `lobby.ready`
2. Server -> client: `lobby.state` (authoritative snapshot), `lobby.event` (transient event).
3. Keep contracts explicit and additive; avoid breaking field renames.

## Frontend Setup

Use the `WebSocketProvider` from the **websocket-setup** skill as transport. Lobby UI subscribes to `lobby.state` + `lobby.event`, updates local state only from authoritative snapshots, and emits intents through `lobby.*` client messages.

## Lobby → Game transition

When all players are ready:
1. Lobby actor creates a game through your game's manager (create one shaped like `LobbyManager` if it doesn't exist)
2. Lobby broadcasts `ServerMsg::GameStarting { game_id }` to all members
3. Clients navigate to the game route
4. Clients send `ClientMsg::GameJoin { game_id }` over the same WebSocket
5. Lobby actor shuts down (or stays alive for "return to lobby")
