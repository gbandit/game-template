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
gbandit --help
gbandit docs
```


## Testing authenticated endpoints

In the dev environment, send `X-Dev-User: eric` (`anna` and `steve` also work) as a header to bypass auth when testing backend endpoints.
