from pathlib import Path


def main() -> None:
    run_directory = (Path(__file__).resolve().parents[1] / '.run').resolve()
    database = (run_directory / 'e2e.db').resolve()
    if database.parent != run_directory:
        raise RuntimeError('Refusing to reset a database outside backend/.run')
    run_directory.mkdir(parents=True, exist_ok=True)
    for candidate in (database, database.with_name(f'{database.name}-wal'), database.with_name(f'{database.name}-shm')):
        candidate.unlink(missing_ok=True)


if __name__ == '__main__':
    main()
