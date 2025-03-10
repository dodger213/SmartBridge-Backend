# IOP DeFi Swap Backend

## Build Image

```bash
$ docker build -f docker/DockerFile -t registry.iop-ventures.com/defi/swap-site-backend/swap-backend:latest .
$ docker login registry.iop-ventures.com
$ docker push registry.iop-ventures.com/defi/swap-site-backend/swap-backend:latest
```

## Compose

You need a `.env` file under the `docker` directory.

```bash
$ cd docker
$ docker-compose up
```