from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('myapp', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='log',
            name='rating',
            field=models.IntegerField(
                blank=True,
                choices=[(1, 1), (2, 2), (3, 3), (4, 4), (5, 5)],
                null=True,
            ),
        ),
    ]
