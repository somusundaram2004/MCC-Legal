from django.core.management.base import BaseCommand, CommandError

from folders.classification_import import import_classified_mous


class Command(BaseCommand):
    help = 'Import classified Ongoing / Expired / Others MoU folders and Excel metadata into MCC Legal.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--source-dir',
            default=r'C:\Users\acer\Desktop\MoU',
            help='Root directory containing Ongoing, Expired, and Others folders.',
        )
        parser.add_argument(
            '--excel-path',
            default=r'C:\Users\acer\Desktop\MoU\MoU_Classification_Summary_By_Department.xlsx',
            help='Path to MoU_Classification_Summary_By_Department.xlsx.',
        )
        parser.add_argument(
            '--target-root',
            default='mou_repository',
            help="Destination root: 'mou_repository' (default) or 'custom_page:<slug>'.",
        )
        parser.add_argument(
            '--storage-mode',
            choices=['local', 'hybrid'],
            default='local',
            help="'local' stores files in MEDIA_ROOT (default); 'hybrid' also uploads to Google Drive.",
        )
        parser.add_argument(
            '--archive-legacy',
            action='store_true',
            help='Move pre-existing non-classified folders under target root into Legacy Unsorted Backup.',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Validate Excel workbook and disk files without modifying the database.',
        )
        parser.add_argument(
            '--update-existing',
            action='store_true',
            help='Update metadata/status/expiry dates for already-imported records.',
        )
        parser.add_argument(
            '--owner-email',
            default=None,
            help='Optional email of user to record as created_by / uploaded_by.',
        )

    def handle(self, *args, **options):
        try:
            summary = import_classified_mous(
                source_dir=options['source_dir'],
                excel_path=options['excel_path'],
                target_root=options['target_root'],
                storage_mode=options['storage_mode'],
                archive_legacy=options['archive_legacy'],
                dry_run=options['dry_run'],
                update_existing=options['update_existing'],
                owner_email=options['owner_email'],
            )
        except Exception as exc:
            raise CommandError(str(exc)) from exc

        prefix = '[DRY-RUN] ' if options['dry_run'] else ''
        self.stdout.write(
            self.style.SUCCESS(
                f"{prefix}Classification import summary: "
                f"folders_created={summary.folders_created}, "
                f"folders_updated={summary.folders_updated}, "
                f"folders_reused={summary.folders_reused}, "
                f"files_created={summary.files_created}, "
                f"files_updated={summary.files_updated}, "
                f"files_skipped={summary.files_skipped}, "
                f"legacy_archived={summary.legacy_archived}, "
                f"drive_uploads={summary.drive_uploads}, "
                f"errors={len(summary.errors)}"
            )
        )
        for err in summary.errors:
            self.stderr.write(self.style.ERROR(f"  - {err}"))

