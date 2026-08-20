"""Run unauthenticated production availability smoke checks."""

from __future__ import annotations

import argparse
import json
from urllib.parse import urljoin
from urllib.request import Request, urlopen


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--api-url", required=True)
    parser.add_argument("--frontend-url", required=True)
    args = parser.parse_args()

    health_url = urljoin(args.api_url.rstrip("/") + "/", "api/v1/health")
    with urlopen(
        Request(health_url, headers={"User-Agent": "reading-tracker-smoke"}), timeout=10
    ) as response:
        health = json.load(response)
        if response.status != 200 or health != {"status": "ok"}:
            raise SystemExit(f"Unexpected health response from {health_url}: {health}")

    with urlopen(
        Request(args.frontend_url, headers={"User-Agent": "reading-tracker-smoke"}),
        timeout=10,
    ) as response:
        html = response.read().decode("utf-8")
        if response.status != 200 or 'id="root"' not in html:
            raise SystemExit(
                f"Frontend did not return the application shell: {args.frontend_url}"
            )

    print("Production availability smoke checks passed.")


if __name__ == "__main__":
    main()
