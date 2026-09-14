import os
import sys
import argparse
import subprocess
from datetime import datetime, timedelta

# Default Connection URL from backend/.env
DEFAULT_DB_URI = "postgresql://postgres.erjlwljdgkhqdkizjlzv:kmzway87aa!!@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"
DEFAULT_OUTPUT_DIR = r"C:\Users\ariss\Database_Backups\GLC_MRA"
SCHEMAS = ["glc_mra", "marketing_budget", "helpdesk"]

def run_backup(db_uri=DEFAULT_DB_URI, output_dir=DEFAULT_OUTPUT_DIR):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    today_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = os.path.join(output_dir, f"glc_mra_backup_{today_str}.sql")

    print(f"=== [1/3] Checking Docker Engine Status ===", flush=True)
    try:
        subprocess.run(["docker", "info"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("Error: Docker is not running. Please start Docker Desktop on your machine.", file=sys.stderr)
        sys.exit(1)

    print(f"=== [2/3] Executing Full Database Dump (Schemas: {', '.join(SCHEMAS)}) ===", flush=True)
    schema_args = []
    for s in SCHEMAS:
        schema_args.extend(["-n", s])

    dump_cmd = [
        "docker", "run", "--rm", "-i", "postgres:17-alpine",
        "pg_dump", db_uri
    ] + schema_args

    try:
        with open(output_file, "wb") as f:
            proc = subprocess.run(dump_cmd, stdout=f, stderr=subprocess.PIPE, check=True)

        file_size_mb = os.path.getsize(output_file) / (1024 * 1024)
        print(f"✓ Backup Success! File saved to:\n  -> {output_file} ({file_size_mb:.2f} MB)", flush=True)

        # Cleanup old backups older than 30 days
        print(f"=== [3/3] Checking & Cleaning Old Backups (>30 days) ===", flush=True)
        now = datetime.now()
        cleaned_count = 0
        for filename in os.listdir(output_dir):
            if filename.startswith("glc_mra_backup_") and filename.endswith(".sql"):
                file_path = os.path.join(output_dir, filename)
                file_time = datetime.fromtimestamp(os.path.getmtime(file_path))
                if now - file_time > timedelta(days=30):
                    os.remove(file_path)
                    cleaned_count += 1
                    print(f"  - Removed old backup: {filename}")

        if cleaned_count == 0:
            print("  - No old backup files to clean up.")

        return output_file

    except subprocess.CalledProcessError as e:
        err_msg = e.stderr.decode("utf-8", errors="ignore")
        print(f"Error executing pg_dump: {err_msg}", file=sys.stderr)
        if os.path.exists(output_file):
            os.remove(output_file)
        sys.exit(1)

def setup_scheduler(time_str="23:00", task_name="GLC_MRA_Daily_Database_Backup"):
    script_path = os.path.abspath(__file__)
    
    # Task action command in PowerShell
    run_command = f"powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -Command \"python '{script_path}' run\""

    cmd = [
        "schtasks", "/create",
        "/tn", task_name,
        "/tr", run_command,
        "/sc", "daily",
        "/st", time_str,
        "/f"
    ]

    try:
        print(f"Registering Task Scheduler task '{task_name}' to run daily at {time_str} WIB...", flush=True)
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        print(f"✓ Success! Task '{task_name}' registered in Windows Task Scheduler.", flush=True)
        print(res.stdout.decode("utf-8", errors="ignore"))
    except subprocess.CalledProcessError as e:
        err_msg = e.stderr.decode("utf-8", errors="ignore")
        print(f"Failed to register task in Windows Task Scheduler: {err_msg}", file=sys.stderr)
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="GLC MRA System Local Database Backup Tool")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Subcommand: run
    parser_run = subparsers.add_parser("run", help="Run database backup immediately")
    parser_run.add_argument("--db-uri", default=DEFAULT_DB_URI, help="Supabase PostgreSQL Connection URI")
    parser_run.add_argument("--output-dir", default=DEFAULT_OUTPUT_DIR, help="Output directory for backup .sql files")

    # Subcommand: setup-scheduler
    parser_setup = subparsers.add_parser("setup-scheduler", help="Register Windows Task Scheduler task")
    parser_setup.add_argument("--time", default="23:00", help="Time to run daily backup (e.g., 23:00)")
    parser_setup.add_argument("--task-name", default="GLC_MRA_Daily_Database_Backup", help="Task name in Task Scheduler")

    args = parser.parse_args()

    if args.command == "run":
        run_backup(args.db_uri, args.output_dir)
    elif args.command == "setup-scheduler":
        setup_scheduler(args.time, args.task_name)

if __name__ == "__main__":
    main()
