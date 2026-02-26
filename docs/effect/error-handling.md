# Data Modeling

TypeScript's built-in tools for modeling data are limited. Effect's `Schema` library provides a robust alternative with runtime validation, serialization, and type safety built in.

## Why Schema?

- **Single source of truth**: define once, get TypeScript types + runtime validation + JSON serialization + auto-generated tooling.
- **Parse safely**: validate HTTP/CLI/config data with detailed errors—catch bad data before it crashes your app.
- **Rich domain types**: branded primitives prevent confusion; classes add methods and behavior.
- **Ecosystem integration**: use the same schema everywhere—RPC, HttpApi, CLI, frontend, backend.

## Foundations

All representable data is composed of two primitives:

- **Records** (AND): a `User` has a name AND an email AND a createdAt
- **Variants** (OR): a `Result` is a Success OR a Failure

If you come from a functional programming background, records are product types and variants are sum types.

Schema gives you tools for both, plus runtime validation and serialization.

## Records (AND Types)

Use `Schema.Class` for composite data models with multiple fields:

```typescript
import { Schema } from "effect"

const UserId = Schema.String.pipe(Schema.brand("UserId"))
type UserId = typeof UserId.Type

export class User extends Schema.Class<User>("User")({
  id: UserId,
  name: Schema.String,
  email: Schema.String,
  createdAt: Schema.Date,
}) {
  // Add custom getters and methods to extend functionality
  get displayName() {
    return `${this.name} (${this.email})`
  }
}

// Usage
const user = User.make({
  id: UserId.make("user-123"),
  name: "Alice",
  email: "alice@example.com",
  createdAt: new Date(),
})

console.log(user.displayName) // "Alice (alice@example.com)"
```

## Variants (OR Types)

Use `Schema.Literal` for simple string or number alternatives:

```typescript
import { Schema } from "effect"

const Status = Schema.Literal("pending", "active", "completed")
type Status = typeof Status.Type // "pending" | "active" | "completed"
```

For structured variants with fields, combine `Schema.TaggedClass` with `Schema.Union`:

```typescript
import { Match, Schema } from "effect"

// Define variants with a tag field
export class Success extends Schema.TaggedClass<Success>()("Success", {
  value: Schema.Number,
}) {}

export class Failure extends Schema.TaggedClass<Failure>()("Failure", {
  error: Schema.String,
}) {}

// Create the union
export const Result = Schema.Union(Success, Failure)
export type Result = typeof Result.Type

// Pattern match with Match.valueTags
const success = Success.make({ value: 42 })
const failure = Failure.make({ error: "oops" })

Match.valueTags(success, {
  Success: ({ value }) => `Got: ${value}`,
  Failure: ({ error }) => `Error: ${error}`
}) // "Got: 42"

Match.valueTags(failure, {
  Success: ({ value }) => `Got: ${value}`,
  Failure: ({ error }) => `Error: ${error}`
}) // "Error: oops"
```

**Benefits:**

- Type-safe exhaustive matching
- Compiler ensures all cases handled
- No possibility of invalid states

## Branded Types

Use branded types to prevent mixing values that have the same underlying type. **In a well-designed domain model, nearly all primitives should be branded**. Not just IDs, but emails, URLs, timestamps, slugs, counts, percentages, and any value with semantic meaning.

```typescript
import { Schema } from "effect"

// IDs - prevent mixing different entity IDs
export const UserId = Schema.String.pipe(Schema.brand("UserId"))
export type UserId = typeof UserId.Type

export const PostId = Schema.String.pipe(Schema.brand("PostId"))
export type PostId = typeof PostId.Type

// Domain primitives - create a rich type system
export const Email = Schema.String.pipe(Schema.brand("Email"))
export type Email = typeof Email.Type

export const Port = Schema.Int.pipe(Schema.between(1, 65535), Schema.brand("Port"))
export type Port = typeof Port.Type

// Usage - impossible to mix types
const userId = UserId.make("user-123")
const postId = PostId.make("post-456")
const email = Email.make("alice@example.com")

function getUser(id: UserId) { return id }
function sendEmail(to: Email) { return to }

// This works
getUser(userId)
sendEmail(email)

// All of these produce type errors
// getUser(postId) // Can't pass PostId where UserId expected
// sendEmail(slug) // Can't pass Slug where Email expected
// const bad: UserId = "raw-string" // Can't assign raw string to branded type
```

## JSON Encoding & Decoding

Use `Schema.parseJson` to parse JSON strings and validate them with your schema in one step. This combines `JSON.parse` + `Schema.decodeUnknown` for decoding, and `JSON.stringify` + `Schema.encode` for encoding:

```typescript
import { Effect, Schema } from "effect"

const Row = Schema.Literal("A", "B", "C", "D", "E", "F", "G", "H")
const Column = Schema.Literal("1", "2", "3", "4", "5", "6", "7", "8")

class Position extends Schema.Class<Position>("Position")({
  row: Row,
  column: Column,
}) {}

class Move extends Schema.Class<Move>("Move")({
  from: Position,
  to: Position,
}) {}

// parseJson combines JSON.parse + schema decoding
// MoveFromJson is a schema that takes a JSON string and returns a Move
const MoveFromJson = Schema.parseJson(Move)

const program = Effect.gen(function* () {
  // Parse and validate JSON string in one step
  // Use MoveFromJson (not Move) to decode from JSON string
  const jsonString = '{"from":{"row":"A","column":"1"},"to":{"row":"B","column":"2"}}'
  const move = yield* Schema.decodeUnknown(MoveFromJson)(jsonString)

  yield* Effect.log("Decoded move", move)

  // Encode to JSON string in one step (typed as string)
  // Use MoveFromJson (not Move) to encode to JSON string
  const json = yield* Schema.encode(MoveFromJson)(move)
  return json
})
```

andrey@Andreys-MacBook-Air GitReel % effect-solutions show error-handling
## Error Handling (error-handling)
# Error Handling

Effect provides structured error handling with Schema integration for serializable, type-safe errors.

## Schema.TaggedError

Define domain errors with `Schema.TaggedError`:

```typescript
import { Schema } from "effect"

class ValidationError extends Schema.TaggedError<ValidationError>()(
  "ValidationError",
  {
    field: Schema.String,
    message: Schema.String,
  }
) {}

class NotFoundError extends Schema.TaggedError<NotFoundError>()(
  "NotFoundError",
  {
    resource: Schema.String,
    id: Schema.String,
  }
) {}

const AppError = Schema.Union(ValidationError, NotFoundError)
type AppError = typeof AppError.Type

// Usage
const error = ValidationError.make({
  field: "email",
  message: "Invalid format",
})
```

**Benefits:**

- Serializable (can send over network/save to DB)
- Type-safe
- Built-in `_tag` for pattern matching
- Custom methods via class
- Sensible default `message` when you don't declare one

**Note:** `Schema.TaggedError` creates yieldable errors that can be used directly without `Effect.fail()`:

```typescript
// ✅ Good: Yieldable errors can be used directly
return error.response.status === 404
  ? UserNotFoundError.make({ id })
  : Effect.die(error)

// ❌ Redundant: no need to wrap with Effect.fail
return error.response.status === 404
  ? Effect.fail(UserNotFoundError.make({ id }))
  : Effect.die(error)
```

## Recovering from Errors

Effect provides several functions for recovering from errors. Use these to handle errors and continue program execution.

### catchAll

Handle all errors by providing a fallback effect:

```typescript
import { Effect, Schema } from "effect"

class HttpError extends Schema.TaggedError<HttpError>()(
  "HttpError",
  {
    statusCode: Schema.Number,
    message: Schema.String,
  }
) {}

class ValidationError extends Schema.TaggedError<ValidationError>()(
  "ValidationError",
  {
    message: Schema.String,
  }
) {}

declare const program: Effect.Effect<string, HttpError | ValidationError>

const recovered: Effect.Effect<string, never> = program.pipe(
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      yield* Effect.logError("Error occurred", error)
      return `Recovered from ${error.name}`
    })
  )
)
```

### catchTag

Handle specific errors by their `_tag`.

```typescript
import { Effect, Schema } from "effect"

class HttpError extends Schema.TaggedError<HttpError>()(
  "HttpError",
  {
    statusCode: Schema.Number,
    message: Schema.String,
  }
) {}

class ValidationError extends Schema.TaggedError<ValidationError>()(
  "ValidationError",
  {
    message: Schema.String,
  }
) {}

const program: Effect.Effect<string, HttpError | ValidationError> =
  HttpError.make({
    statusCode: 500,
    message: "Internal server error",
  })

const recovered: Effect.Effect<string, ValidationError> = program.pipe(
  Effect.catchTag("HttpError", (error) =>
    Effect.gen(function* () {
      yield* Effect.logWarning(`HTTP ${error.statusCode}: ${error.message}`)
      return "Recovered from HttpError"
    })
  )
)
```

### catchTags

Handle multiple error types at once.

```typescript
import { Effect, Schema } from "effect"

class HttpError extends Schema.TaggedError<HttpError>()(
  "HttpError",
  {
    statusCode: Schema.Number,
    message: Schema.String,
  }
) {}

class ValidationError extends Schema.TaggedError<ValidationError>()(
  "ValidationError",
  {
    message: Schema.String,
  }
) {}

const program: Effect.Effect<string, HttpError | ValidationError> =
  HttpError.make({
    statusCode: 500,
    message: "Internal server error",
  })

const recovered: Effect.Effect<string, never> = program.pipe(
  Effect.catchTags({
    HttpError: () => Effect.succeed("Recovered from HttpError"),
    ValidationError: () => Effect.succeed("Recovered from ValidationError")
  })
)
```

## Expected Errors vs Defects

Effect tracks errors in the type system (`Effect<A, E, R>`) so callers know what can go wrong and can recover. But tracking only matters if recovery is possible. When there's no sensible way to recover, use a defect instead: it terminates the fiber and you handle it once at the system boundary (logging, crash reporting, graceful shutdown).

**Use typed errors** for domain failures the caller can handle: validation errors, "not found", permission denied, rate limits.

**Use defects** for unrecoverable situations: bugs and invariant violations.

```typescript
import { Effect } from "effect"
// hide-start
declare const loadConfig: Effect.Effect<{ port: number }, Error>
// hide-end

// At app entry: if config fails, nothing can proceed
const main = Effect.gen(function* () {
  const config = yield* loadConfig.pipe(Effect.orDie)
  yield* Effect.log(`Starting on port ${config.port}`)
})
```

**When to catch defects:** Almost never. Only at system boundaries for logging/diagnostics. Use `Effect.exit` to inspect or `Effect.catchAllDefect` if you must recover (e.g., plugin sandboxing).

## Schema.Defect - Wrapping Unknown Errors

Use `Schema.Defect` to wrap unknown errors from external libraries.

```typescript
import { Schema, Effect } from "effect"

class ApiError extends Schema.TaggedError<ApiError>()(
  "ApiError",
  {
    endpoint: Schema.String,
    statusCode: Schema.Number,
    // Wrap the underlying error from fetch/axios/etc
    error: Schema.Defect,
  }
) {}

// Usage - catching errors from external libraries
const fetchUser = (id: string) =>
  Effect.tryPromise({
    try: () => fetch(`/api/users/${id}`).then((r: Response) => r.json()),
    catch: (error) => ApiError.make({
      endpoint: `/api/users/${id}`,
      statusCode: 500,
      error
    })
  })
```

**Schema.Defect handles:**

- JavaScript `Error` instances → `{ name, message }` objects
- Any unknown value → string representation
- Serializable for network/storage

**Use for:**

- Wrapping errors from external libraries (fetch, axios, etc)
- Network boundaries (API errors)
- Persisting errors to DB
- Logging systems