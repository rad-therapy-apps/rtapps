import json
import sys

from app.config import Settings
from app.main import create_app


def main() -> None:
    settings = Settings(env="test", database_url="postgresql+asyncpg://x:x@localhost/x")
    json.dump(create_app(settings).openapi(), sys.stdout, indent=2, sort_keys=True)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
