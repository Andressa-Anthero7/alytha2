from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Envia um e-mail de teste para validar o SMTP configurado no ambiente.'

    def add_arguments(self, parser):
        parser.add_argument('recipient', help='E-mail que recebera a mensagem de teste.')
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Mostra a configuracao carregada sem enviar e-mail.',
        )

    def handle(self, *args, **options):
        recipient = options['recipient']
        backend = settings.EMAIL_BACKEND

        self.stdout.write(f'EMAIL_BACKEND: {backend}')
        self.stdout.write(f'EMAIL_HOST: {settings.EMAIL_HOST or "(nao configurado)"}')
        self.stdout.write(f'EMAIL_PORT: {settings.EMAIL_PORT}')
        self.stdout.write(f'EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}')
        self.stdout.write(f'EMAIL_USE_SSL: {settings.EMAIL_USE_SSL}')
        self.stdout.write(f'DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}')

        if options['dry_run']:
            self.stdout.write(self.style.WARNING('Dry-run: e-mail nao enviado.'))
            return

        if backend != 'django.core.mail.backends.smtp.EmailBackend':
            self.stdout.write(self.style.WARNING('O backend atual nao e SMTP. Em producao, configure SMTP real.'))

        sent = send_mail(
            'Teste SMTP Alytha',
            (
                'Este e-mail confirma que o SMTP da plataforma Alytha esta configurado '
                'e conseguindo enviar mensagens.'
            ),
            settings.DEFAULT_FROM_EMAIL,
            [recipient],
            fail_silently=False,
        )

        if sent != 1:
            raise SystemExit('SMTP nao confirmou o envio da mensagem.')

        self.stdout.write(self.style.SUCCESS(f'E-mail de teste enviado para {recipient}.'))
