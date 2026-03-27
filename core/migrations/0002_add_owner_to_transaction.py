# This migration is now a no-op.
# The owner field was already created in 0001_initial.py, so the AddField
# here caused a DuplicateColumn error. Keeping the file to preserve the
# migration chain.

from django.conf import settings
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # No operations needed — owner field already exists from 0001_initial.
    ]

