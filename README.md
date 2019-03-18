# tmsocial-rust
The new cmsocial!

# Installation

## Dependencies

- Rust 2018 (via rustup for example)
- Postgres
- task-maker

## Configuring the database

Configure the database in order to have a user with write access to a database

## Configuring tmsocial

Copy the `.env.sample` file into `.env` and change the options you like, for
example the database connection string.

## Compiling

We use cargo for managing the dependencies, issue `cargo build` to build all the
backend stuff

## Applying the migrations

You'll need to have `diesel_cli` installed (`cargo install diesel_cli`), and
then issue `~/.cargo/bin/diesel migration run`, this should create a bunch of
tables in the db.

## Running the backend

For a developing environment the suggested command is:
```bash
RUST_LOG=actix_web=debug,tmsocial ~/.cargo/bin/systemfd --no-pid -s http::8083 -- cargo watch -x 'run --bin tmsocial'
```

You don't want a production environment yet :P

## Running the frontend

_Not yet_ 