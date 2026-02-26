import { Config, Context, Effect, Layer, Redacted } from "effect";
import { Octokit } from "octokit";

export class OctokitError {
  readonly _tag = "OctokitError" as const;
  readonly cause: unknown;
  constructor(cause: unknown) {
    this.cause = cause;
  }
}

export class OctokitClient extends Context.Tag("@gitreel/OctokitClient")<
  OctokitClient,
  {
    readonly use: <A>(
      fn: (client: Octokit) => Promise<A>
    ) => Effect.Effect<A, OctokitError>;
  }
>() {
  static readonly Default = Layer.effect(
    OctokitClient,
    Effect.gen(function* () {
      const token = yield* Config.redacted("GITHUB_TOKEN");
      const octokit = new Octokit({ auth: Redacted.value(token) });
      return {
        use: <A>(fn: (client: Octokit) => Promise<A>) =>
          Effect.tryPromise({
            try: () => fn(octokit),
            catch: (e) => new OctokitError(e),
          }).pipe(Effect.withSpan("octokit.use")),
      };
    })
  );
}
