"""Loopback-only development server entry point."""

import logging

import uvicorn


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    uvicorn.run(
        "earth_trend.api.app:create_app",
        factory=True,
        host="127.0.0.1",
        port=8000,
        access_log=False,
    )


if __name__ == "__main__":
    main()
