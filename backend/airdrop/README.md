# Solana test tokens faucet

### Developing

For start web server add `.env` (see `.env.example`).

```shell
yarn install
yarn dev
yarn build
```

For start build from `/dist` dir:

```shell
yarn start 
```

### Testing

For run tests should add `/tests/.env` (see `/tests/.env.example`)

```shell
yarn test
```


### Run with Docker Compose
For start web server add `.env` (see `.env.example`).

```shell
docker-compose up --build -d
```