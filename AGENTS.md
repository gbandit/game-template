## The gbandit cli

Always use the `gbandit` CLI to build and deploy:
```bash
gbandit deploy --message "<what you just changed>" # Only deploys to dev, this is safe to run whenever
```
Never build, bundle or run tests in the project locally using commands like `cargo build` or `bun run dev`. All building and deploying is handled remotely by the gbandit platform.

Other useful CLI commands:
```bash
gbandit logs [frontend|backend]
gbandit sql "SELECT ..."
gbandit env [set|list|delete]
gbandit test-token [1-10]
gbandit --help
gbandit docs
```


## Testing authenticated endpoints

`gbandit test-token [1-10]` prints a token for one of the project's Test Users, made-up players of the dev environment. Each number is the same player every time, so use several to test anything multiplayer:
```bash
curl -H "Authorization: Bearer $(gbandit test-token 1)" https://dev-<slug>.gbandit.com/api/me
curl -H "Authorization: Bearer $(gbandit test-token 2 --guest)" https://dev-<slug>.gbandit.com/api/me
```
`--guest` gives the guest with that number, `test-guest-<n>`, a player of its own. A token lasts 30 minutes and only works against dev.
