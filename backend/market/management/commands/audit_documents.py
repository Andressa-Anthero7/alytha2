from collections import defaultdict

from django.core.management.base import BaseCommand

from market.models import User, only_digits


class Command(BaseCommand):
    help = 'Audita CPF/CNPJ normalizados, reporta duplicidades e opcionalmente preenche document_number_digits.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--fix',
            action='store_true',
            help='Preenche document_number_digits para documentos unicos. Duplicados permanecem em branco.',
        )

    def handle(self, *args, **options):
        by_document = defaultdict(list)
        users = User.objects.only('id', 'name', 'email', 'document_number', 'document_number_digits').order_by('id')

        for user in users:
            digits = only_digits(user.document_number)
            if digits:
                by_document[digits].append(user)

        duplicated_groups = {digits: group for digits, group in by_document.items() if len(group) > 1}
        fixed_count = 0

        if options['fix']:
            for digits, group in by_document.items():
                if len(group) > 1:
                    for user in group:
                        if user.document_number_digits:
                            user.document_number_digits = ''
                            user.save(update_fields=['document_number_digits'])
                    continue

                user = group[0]
                if user.document_number_digits != digits:
                    user.document_number_digits = digits
                    user.save(update_fields=['document_number_digits'])
                    fixed_count += 1

        if duplicated_groups:
            self.stdout.write(self.style.WARNING('Documentos duplicados encontrados:'))
            for digits, group in duplicated_groups.items():
                users_label = ', '.join(f'{user.id} ({user.email})' for user in group)
                self.stdout.write(f'- {digits}: {users_label}')
        else:
            self.stdout.write(self.style.SUCCESS('Nenhum CPF/CNPJ duplicado encontrado.'))

        if options['fix']:
            self.stdout.write(self.style.SUCCESS(f'Documentos normalizados atualizados: {fixed_count}'))
