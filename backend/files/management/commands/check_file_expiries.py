from django.core.management.base import BaseCommand
from files.expiry_service import check_file_expiries

class Command(BaseCommand):
    help = "Checks file validity expiries and dispatches scheduled notifications to authorized recipients."

    def handle(self, *args, **options):
        self.stdout.write("Checking file expiries across department folders...")
        notifications = check_file_expiries()
        self.stdout.write(self.style.SUCCESS(f"Successfully processed file expiries. Created {len(notifications)} notification(s)."))

