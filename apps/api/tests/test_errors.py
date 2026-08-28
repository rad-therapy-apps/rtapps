from httpx import AsyncClient


async def test_404_is_problem_json(client: AsyncClient) -> None:
    r = await client.get("/api/v1/does-not-exist")
    assert r.status_code == 404
    assert r.headers["content-type"].startswith("application/problem+json")
    assert r.json()["status"] == 404


async def test_docs_disabled_in_prod() -> None:
    from app.config import Settings
    from app.main import create_app

    app = create_app(Settings(env="prod", session_secret="x" * 32))
    assert app.openapi_url is None
