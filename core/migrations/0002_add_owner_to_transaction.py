# Generated migration to add owner field to existing Transaction table

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def set_default_owner(apps, schema_editor):
    """Set a default owner for existing transactions"""
    Transaction = apps.get_model('core', 'Transaction')
    User = apps.get_model(settings.AUTH_USER_MODEL)
    
    # Get the first user
    if User.objects.exists():
        default_user = User.objects.first()
        # Set all existing transactions to the default user
        Transaction.objects.filter(owner__isnull=True).update(owner=default_user)


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='transaction',
            name='owner',
            field=models.ForeignKey(
                null=True,  # Allow null initially for existing records
                blank=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='transactions',
                to=settings.AUTH_USER_MODEL
            ),
        ),
        migrations.RunPython(set_default_owner, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='transaction',
            name='owner',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='transactions',
                to=settings.AUTH_USER_MODEL
            ),
        ),
    ]

