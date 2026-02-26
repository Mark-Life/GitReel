import { Schema } from "effect";

export const CommitSha = Schema.String.pipe(Schema.brand("CommitSha"));
export type CommitSha = typeof CommitSha.Type;

export const GitHubLogin = Schema.String.pipe(Schema.brand("GitHubLogin"));
export type GitHubLogin = typeof GitHubLogin.Type;

export class RepoMeta extends Schema.Class<RepoMeta>("RepoMeta")({
  owner: Schema.String,
  name: Schema.String,
  fullName: Schema.String,
  description: Schema.NullOr(Schema.String),
  stars: Schema.Number,
  forks: Schema.Number,
  defaultBranch: Schema.String,
  createdAt: Schema.String,
}) {}

export class CommitAuthor extends Schema.Class<CommitAuthor>("CommitAuthor")({
  name: Schema.String,
  login: Schema.NullOr(GitHubLogin),
  avatarUrl: Schema.NullOr(Schema.String),
}) {}

export class TimelineCommit extends Schema.Class<TimelineCommit>(
  "TimelineCommit"
)({
  sha: CommitSha,
  message: Schema.String,
  author: CommitAuthor,
  date: Schema.String,
}) {}

export class TreeFile extends Schema.Class<TreeFile>("TreeFile")({
  path: Schema.String,
  size: Schema.Number,
  language: Schema.NullOr(Schema.String),
}) {}

export class TreeSnapshot extends Schema.Class<TreeSnapshot>("TreeSnapshot")({
  sha: CommitSha,
  date: Schema.String,
  files: Schema.Array(TreeFile),
  truncated: Schema.Boolean,
}) {}

export class Contributor extends Schema.Class<Contributor>("Contributor")({
  login: GitHubLogin,
  avatarUrl: Schema.String,
  contributions: Schema.Number,
}) {}

export const LanguageBreakdown = Schema.Record({
  key: Schema.String,
  value: Schema.Number,
});
export type LanguageBreakdown = typeof LanguageBreakdown.Type;

export class RepoTimeline extends Schema.Class<RepoTimeline>("RepoTimeline")({
  meta: RepoMeta,
  commits: Schema.Array(TimelineCommit),
  snapshots: Schema.Array(TreeSnapshot),
  languages: LanguageBreakdown,
  contributors: Schema.Array(Contributor),
  fetchedAt: Schema.String,
}) {}
