import os
from collections import defaultdict

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import connection
from django.db.migrations.executor import MigrationExecutor

from market.models import User, only_digits


PRODUCTION_DOMAIN = 'https://plataforma.alytha.agr.br'
PRODUCTION_HOST = 'plataforma.alytha.agr.br'


class Command(BaseCommand):
    help = 'Executa uma checagem objetiva de configuracao antes do deploy de producao.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--allow-sqlite',
            action='store_true',
            help='Permite SQLite apenas para dry-run local. Nao usar em producao.',
        )
        parser.add_argument(
            '--skip-db-connection',
            action='store_true',
            help='Nao abre conexao com o banco. Use apenas quando o banco real ainda nao existir.',
        )
        parser.add_argument(
            '--allow-document-duplicates',
            action='store_true',
            help='Nao falha por documentos duplicados existentes. Use apenas antes de limpar a base.',
        )

    def handle(self, *args, **options):
        failures = []
        warnings = []

        self._check_settings(failures, warnings, options)

        if options['skip_db_connection']:
            warnings.append('Conexao com banco pulada por --skip-db-connection.')
        else:
            self._check_database(failures)
            self._check_migrations(failures)
            self._check_duplicate_documents(failures, warnings, options)

        self._run_django_deploy_check(failures)

        for warning in warnings:
            self.stdout.write(self.style.WARNING(f'AVISO: {warning}'))

        if failures:
            for failure in failures:
                self.stdout.write(self.style.ERROR(f'FALHA: {failure}'))
            raise SystemExit(1)

        self.stdout.write(self.style.SUCCESS('Checklist de predeploy aprovado.'))

    def _check_settings(self, failures, warnings, options):
        if settings.DEBUG:
            failures.append('DJANGO_DEBUG precisa estar false em producao.')

        secret_key = settings.SECRET_KEY or ''
        if len(secret_key) < 50 or secret_key.startswith('django-insecure-') or 'troque' in secret_key.lower():
            failures.append('DJANGO_SECRET_KEY precisa ser longa, aleatoria e real.')

        allowed_hosts = set(settings.ALLOWED_HOSTS or [])
        if '*' in allowed_hosts:
            failures.append('DJANGO_ALLOWED_HOSTS nao pode usar wildcard (*).')
        if PRODUCTION_HOST not in allowed_hosts:
            failures.append(f'DJANGO_ALLOWED_HOSTS precisa incluir {PRODUCTION_HOST}.')

        cors_origins = set(getattr(settings, 'CORS_ALLOWED_ORIGINS', []) or [])
        csrf_origins = set(getattr(settings, 'CSRF_TRUSTED_ORIGINS', []) or [])
        if PRODUCTION_DOMAIN not in cors_origins:
            failures.append(f'DJANGO_CORS_ALLOWED_ORIGINS precisa incluir {PRODUCTION_DOMAIN}.')
        if PRODUCTION_DOMAIN not in csrf_origins:
            failures.append(f'DJANGO_CSRF_TRUSTED_ORIGINS precisa incluir {PRODUCTION_DOMAIN}.')

        if getattr(settings, 'ALYTHA_PUBLIC_SITE_URL', '') != PRODUCTION_DOMAIN:
            failures.append(f'ALYTHA_PUBLIC_SITE_URL precisa ser {PRODUCTION_DOMAIN}.')
        if getattr(settings, 'ALYTHA_EXPOSE_PASSWORD_RESET_TOKEN', False):
            failures.append('ALYTHA_EXPOSE_PASSWORD_RESET_TOKEN precisa ser false em producao.')

        if not settings.SECURE_SSL_REDIRECT:
            failures.append('DJANGO_SECURE_SSL_REDIRECT precisa estar true.')
        if not settings.SESSION_COOKIE_SECURE:
            failures.append('DJANGO_SESSION_COOKIE_SECURE precisa estar true.')
        if not settings.CSRF_COOKIE_SECURE:
            failures.append('DJANGO_CSRF_COOKIE_SECURE precisa estar true.')
        if settings.SECURE_HSTS_SECONDS < 31536000:
            failures.append('DJANGO_SECURE_HSTS_SECONDS deve ser pelo menos 31536000.')
        if not settings.SECURE_HSTS_INCLUDE_SUBDOMAINS:
            warnings.append('DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS esta false.')
        if not settings.SECURE_HSTS_PRELOAD:
            warnings.append('DJANGO_SECURE_HSTS_PRELOAD esta false; habilite somente quando tiver certeza do HTTPS definitivo.')
        if not settings.SECURE_PROXY_SSL_HEADER:
            failures.append('DJANGO_SECURE_PROXY_SSL_HEADER precisa estar ativo atras de proxy HTTPS.')

        engine = settings.DATABASES['default']['ENGINE']
        if 'postgresql' not in engine and not options['allow_sqlite']:
            failures.append('DATABASE_URL precisa apontar para PostgreSQL em producao.')
        if not os.environ.get('DATABASE_URL') and 'postgresql' in engine:
            warnings.append('Engine PostgreSQL ativa, mas DATABASE_URL nao esta visivel no ambiente.')

        email_backend = settings.EMAIL_BACKEND
        if email_backend != 'django.core.mail.backends.smtp.EmailBackend':
            failures.append('DJANGO_EMAIL_BACKEND precisa ser django.core.mail.backends.smtp.EmailBackend.')
        for name, value in (
            ('DJANGO_EMAIL_HOST', settings.EMAIL_HOST),
            ('DJANGO_EMAIL_HOST_USER', settings.EMAIL_HOST_USER),
            ('DJANGO_EMAIL_HOST_PASSWORD', settings.EMAIL_HOST_PASSWORD),
            ('DJANGO_DEFAULT_FROM_EMAIL', settings.DEFAULT_FROM_EMAIL),
        ):
            if not value or 'troque' in str(value).lower() or 'seu-provedor' in str(value).lower():
                failures.append(f'{name} precisa estar configurado com valor real.')

    def _check_database(self, failures):
        try:
            connection.ensure_connection()
        except Exception as exc:
            failures.append(f'Nao foi possivel conectar ao banco configurado: {exc}')

    def _check_migrations(self, failures):
        try:
            executor = MigrationExecutor(connection)
            plan = executor.migration_plan(executor.loader.graph.leaf_nodes())
        except Exception as exc:
            failures.append(f'Nao foi possivel verificar migrations pendentes: {exc}')
            return

        if plan:
            pending = ', '.join(f'{migration.app_label}.{migration.name}' for migration, _ in plan)
            failures.append(f'Existem migrations pendentes: {pending}')

    def _check_duplicate_documents(self, failures, warnings, options):
        by_document = defaultdict(list)
        for user in User.objects.only('id', 'email', 'document_number').order_by('id'):
            digits = only_digits(user.document_number)
            if digits:
                by_document[digits].append(user)

        duplicates = {digits: users for digits, users in by_document.items() if len(users) > 1}
        if not duplicates:
            return

        details = []
        for digits, users in duplicates.items():
            details.append(f'{digits}: ' + ', '.join(f'{user.id} ({user.email})' for user in users))
        message = 'CPF/CNPJ duplicado encontrado: ' + '; '.join(details)
        if options['allow_document_duplicates']:
            warnings.append(message)
        else:
            failures.append(message)

    def _run_django_deploy_check(self, failures):
        try:
            call_command('check', '--deploy', verbosity=0)
        except SystemExit:
            failures.append('python manage.py check --deploy retornou falha.')
        except Exception as exc:
            failures.append(f'Erro ao executar check --deploy: {exc}')
