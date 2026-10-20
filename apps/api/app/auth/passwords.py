"""Password hashing and strength validation using Argon2id.

What this file does: validates a plaintext password meets a minimum length, hashes a
password for storage, and verifies a plaintext password against a stored hash.

Used here and why: `argon2-cffi`, implementing Argon2id — the algorithm
`docs/03-architecture.md` §8 specifies for password storage, tuned to cost real time
(making brute-forcing expensive) while staying fast enough for interactive login.

How it fits the project: used wherever a password is set or checked — registration and
login in `app/auth/router.py`, and the dev accounts created by `app/seed.py`.

Depends on: `argon2-cffi` (third-party).
Used by: `app/auth/router.py` (hash_password, verify_password), `app/seed.py`
(hash_password), `tests/test_passwords.py`.
"""

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

MIN_PASSWORD_LENGTH = 10
_hasher = PasswordHasher()  # module-level: reuses argon2-cffi's default (pre-tuned) parameters


def validate_password_strength(plain: str) -> None:
    # Called by change-password (app/auth/router.py). Its ChangePasswordIn already enforces
    # Field(min_length=10) (same floor as RegisterIn), so a too-short password is rejected
    # with a 422 before the route runs and this ValueError is unreachable from a request.
    # It stays as a defence-in-depth check should another caller skip the schema.
    if len(plain) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters")


def hash_password(plain: str) -> str:
    # Argon2id; the salt is generated per call and embedded in the returned hash string.
    return _hasher.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    # Any of these argon2 exceptions just means "doesn't match" or "not a valid hash" —
    # both are treated as a failed verification rather than raised further.
    try:
        return _hasher.verify(hashed, plain)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False
