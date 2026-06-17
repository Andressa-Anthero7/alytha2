import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from market.models import User


class Command(BaseCommand):
    help = 'Cria ou atualiza o usuario inicial de backoffice para producao.'

    def add_arguments(self, parser):
        parser.add_argument('--email', default=os.environ.get('ALYTHA_INITIAL_BACKOFFICE_EMAIL', ''))
        parser.add_argument('--name', default=os.environ.get('ALYTHA_INITIAL_BACKOFFICE_NAME', 'Backoffice Alytha'))
        parser.add_argument('--password', default=os.environ.get('ALYTHA_INITIAL_BACKOFFICE_PASSWORD', ''))
        parser.add_argument(
            '--superuser',
            action='store_true',
            help='Tambem marca o usuario Django como superuser.',
        )

    def handle(self, *args, **options):
        email = str(options['email'] or '').strip().lower()
        name = str(options['name'] or '').strip() or 'Backoffice Alytha'
        password = str(options['password'] or '').strip()

        if not email:
            raise SystemExit('Informe --email ou ALYTHA_INITIAL_BACKOFFICE_EMAIL.')
        if not password:
            raise SystemExit('Informe --password ou ALYTHA_INITIAL_BACKOFFICE_PASSWORD.')

        auth_model = get_user_model()

        with transaction.atomic():
            market_user, market_created = User.objects.update_or_create(
                email=email,
                defaults={
                    'name': name,
                    'type': 'backoffice',
                    'is_validated': True,
                },
            )

            auth_user, auth_created = auth_model.objects.get_or_create(
                username=email,
                defaults={
                    'email': email,
                    'first_name': name,
                    'is_staff': True,
                    'is_superuser': bool(options['superuser']),
                },
            )
            auth_user.email = email
            auth_user.first_name = name
            auth_user.is_staff = True
            if options['superuser']:
                auth_user.is_superuser = True
            auth_user.set_password(password)
            auth_user.save()

        action = 'criado' if market_created or auth_created else 'atualizado'
        self.stdout.write(self.style.SUCCESS(f'Usuario backoffice {action}: {market_user.email}'))
