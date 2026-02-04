"""
Compare local and remote (e.g. Railway) PostgreSQL database schemas.
Outputs tables, columns, and differences.

Usage:
  REMOTE_DATABASE_URL="postgresql://user:pass@host:port/db" python compare_db_schemas.py
  # or
  python compare_db_schemas.py "postgresql://user:pass@host:port/db"

Local DB: DATABASE_URL env or default postgresql://$USER@localhost:5432/outfit_suggestor
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.engine import reflection
from urllib.parse import urlparse


def get_connection_info(url: str) -> str:
    p = urlparse(url)
    return f"{p.username}@{p.hostname}:{p.port or 5432}/{p.path.lstrip('/')}"


def fetch_schema(engine):
    """Return dict: table_name -> list of (column_name, data_type, is_nullable, column_default)."""
    result = {}
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT table_name, column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = 'public'
            ORDER BY table_name, ordinal_position
        """)).fetchall()
        for table_name, column_name, data_type, is_nullable, column_default in rows:
            result.setdefault(table_name, []).append({
                "name": column_name,
                "type": data_type,
                "nullable": is_nullable == "YES",
                "default": column_default,
            })
    return result


def fetch_fks(engine):
    """Return list of (table, column, ref_table, ref_column)."""
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS ref_table,
                ccu.column_name AS ref_column
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage ccu
                ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
            ORDER BY tc.table_name, kcu.column_name
        """)).fetchall()
        return [tuple(r) for r in rows]


def run_compare():
    local_url = os.getenv("DATABASE_URL")
    if not local_url:
        import getpass
        local_url = f"postgresql://{getpass.getuser()}@localhost:5432/outfit_suggestor"

    args = [a for a in sys.argv[1:] if a.strip() and not a.startswith("--")]
    local_only = "--local-only" in sys.argv

    remote_url = os.getenv("REMOTE_DATABASE_URL") or os.getenv("RAILWAY_DATABASE_URL")
    if args:
        remote_url = args[0].strip()

    if not remote_url and not local_only:
        print("Usage: REMOTE_DATABASE_URL='postgresql://...' python compare_db_schemas.py")
        print("   or: python compare_db_schemas.py 'postgresql://user:pass@host:port/db'")
        print("   or: python compare_db_schemas.py --local-only  # print local schema only")
        sys.exit(1)

    if local_only:
        print("Local: ", get_connection_info(local_url))
        print("(--local-only: showing local schema only; no remote comparison)\n")
    else:
        print("Local:  ", get_connection_info(local_url))
        print("Remote: ", get_connection_info(remote_url))
        print()

    try:
        local_engine = create_engine(local_url)
        if not local_only:
            remote_engine = create_engine(remote_url)
    except Exception as e:
        print(f"Error creating engine: {e}")
        sys.exit(1)

    try:
        with local_engine.connect() as c:
            c.execute(text("SELECT 1"))
    except Exception as e:
        print(f"Local DB connection failed: {e}")
        sys.exit(1)

    if not local_only:
        try:
            with remote_engine.connect() as c:
                c.execute(text("SELECT 1"))
        except Exception as e:
            print(f"Remote DB connection failed: {e}")
            sys.exit(1)

    local_schema = fetch_schema(local_engine)
    local_fks = fetch_fks(local_engine)
    if local_only:
        remote_schema = {}
        remote_fks = []
    else:
        remote_schema = fetch_schema(remote_engine)
        remote_fks = fetch_fks(remote_engine)

    all_tables = sorted(set(local_schema.keys()) | set(remote_schema.keys()))
    diff_lines = []

    if local_only:
        diff_lines.append("## Local schema (tables and columns)")
        diff_lines.append("")
        for table in all_tables:
            cols = local_schema.get(table, [])
            diff_lines.append(f"### {table}")
            for c in cols:
                null_str = "NULL" if c["nullable"] else "NOT NULL"
                def_str = f" DEFAULT {c['default']}" if c.get("default") else ""
                diff_lines.append(f"- **{c['name']}** {c['type']} {null_str}{def_str}")
            diff_lines.append("")
        diff_lines.append("## Foreign keys (local)")
        diff_lines.append("")
        for row in sorted(local_fks):
            diff_lines.append(f"- {row[0]}.{row[1]} -> {row[2]}.{row[3]}")
        diff_lines.append("")
        report = "\n".join(diff_lines)
        print(report)
        out_path = os.path.join(os.path.dirname(__file__), "..", "DB_SCHEMA_COMPARISON.md")
        with open(out_path, "w") as f:
            f.write("# Local database schema\n\n")
            f.write(f"- **Source:** `{get_connection_info(local_url)}`\n\n")
            f.write(report)
        print(f"\nReport written to: {out_path}")
    else:
        diff_lines.append("## Schema comparison: Local vs Remote")
        diff_lines.append("")
        diff_lines.append("| Table | Column | Local | Remote | Difference |")
        diff_lines.append("|-------|--------|-------|--------|------------|")

        for table in all_tables:
            local_cols = {c["name"]: c for c in local_schema.get(table, [])}
            remote_cols = {c["name"]: c for c in remote_schema.get(table, [])}
            all_cols = sorted(set(local_cols.keys()) | set(remote_cols.keys()))

            if table not in local_schema:
                diff_lines.append(f"| {table} | *(table)* | — | exists | **Table only on REMOTE** |")
            elif table not in remote_schema:
                diff_lines.append(f"| {table} | *(table)* | exists | — | **Table only on LOCAL** |")

            for col in all_cols:
                L = local_cols.get(col)
                R = remote_cols.get(col)
                if not L and R:
                    diff_lines.append(f"| {table} | {col} | — | {R['type']} {'(nullable)' if R['nullable'] else ''} | **Column only on REMOTE** |")
                elif L and not R:
                    diff_lines.append(f"| {table} | {col} | {L['type']} {'(nullable)' if L['nullable'] else ''} | — | **Column only on LOCAL** |")
                elif L and R:
                    same = L["type"] == R["type"] and L["nullable"] == R["nullable"]
                    def_str = ""
                    if L.get("default") != R.get("default"):
                        same = False
                        def_str = f" default: L={L.get('default')} R={R.get('default')}"
                    if not same:
                        diff_lines.append(f"| {table} | {col} | {L['type']} (null={L['nullable']}) | {R['type']} (null={R['nullable']}) | **Type/null/default differ**{def_str} |")

        diff_lines.append("")
        diff_lines.append("## Foreign keys")
        diff_lines.append("")
        local_fk_set = set(local_fks)
        remote_fk_set = set(remote_fks)
        only_local = local_fk_set - remote_fk_set
        only_remote = remote_fk_set - local_fk_set
        if only_local:
            diff_lines.append("**Only on LOCAL:**")
            for row in sorted(only_local):
                diff_lines.append(f"  - {row[0]}.{row[1]} -> {row[2]}.{row[3]}")
            diff_lines.append("")
        if only_remote:
            diff_lines.append("**Only on REMOTE:**")
            for row in sorted(only_remote):
                diff_lines.append(f"  - {row[0]}.{row[1]} -> {row[2]}.{row[3]}")
            diff_lines.append("")
        if not only_local and not only_remote:
            diff_lines.append("No FK differences.")
            diff_lines.append("")

        report = "\n".join(diff_lines)
        print(report)

        out_path = os.path.join(os.path.dirname(__file__), "..", "DB_SCHEMA_COMPARISON.md")
        with open(out_path, "w") as f:
            f.write("# Database schema comparison (Local vs Remote)\n\n")
            f.write(f"- **Local:**  `{get_connection_info(local_url)}`\n")
            f.write(f"- **Remote:** `{get_connection_info(remote_url)}`\n\n")
            f.write(report)
        print(f"\nReport written to: {out_path}")

    local_engine.dispose()
    if not local_only:
        remote_engine.dispose()


if __name__ == "__main__":
    run_compare()
