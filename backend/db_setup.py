import os
import sys
import environ

def setup_database():
    """
    Automated Database Provisioning & Connection Verification for MySQL, PostgreSQL, and SQLite.
    Automatically creates the target MySQL database schema if it doesn't exist.
    """
    env = environ.Env()
    base_dir = os.path.dirname(os.path.abspath(__file__))
    environ.Env.read_env(os.path.join(base_dir, '.env'))

    db_engine = env('DB_ENGINE', default='django.db.backends.mysql')
    db_name = env('DB_NAME', default='mcc_legal')
    db_user = env('DB_USER', default='root')
    db_password = env('DB_PASSWORD', default='')
    db_host = env('DB_HOST', default='127.0.0.1')
    db_port = env('DB_PORT', default='3306')

    if 'mysql' in db_engine:
        print(f"Attempting to connect to MySQL database server at {db_host}:{db_port}...")
        try:
            import pymysql
            pymysql.install_as_MySQLdb()
            conn = pymysql.connect(
                host=db_host,
                user=db_user,
                password=db_password,
                port=int(db_port),
                connect_timeout=3
            )
            cursor = conn.cursor()
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
            print(f"MySQL database '{db_name}' verified / created successfully on '{db_host}:{db_port}'.")
            cursor.close()
            conn.close()
            return True
        except Exception as e:
            print("\n" + "=" * 60)
            print("WARNING: MySQL connection could not be established.")
            print(f"Error details: {e}")
            print("To use local MySQL, start your MySQL server (XAMPP / WAMP / MySQL Service).")
            print("=" * 60 + "\n")
            return False

    elif 'postgresql' in db_engine:
        print(f"Attempting to connect to PostgreSQL at {db_host}:{db_port}...")
        try:
            import psycopg2
            from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
            conn = psycopg2.connect(
                dbname="postgres",
                user=db_user,
                password=db_password,
                host=db_host,
                port=db_port,
                connect_timeout=3
            )
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            cursor = conn.cursor()
            cursor.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{db_name}';")
            exists = cursor.fetchone()

            if not exists:
                cursor.execute(f"CREATE DATABASE {db_name};")
                print(f"PostgreSQL database '{db_name}' created successfully.")
            else:
                print(f"PostgreSQL database '{db_name}' verified.")

            cursor.close()
            conn.close()
            return True
        except Exception as e:
            print(f"PostgreSQL connection failed: {e}")
            return False

    else:
        print("SQLite database engine configured.")
        return True

if __name__ == "__main__":
    setup_database()
