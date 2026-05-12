import hashlib
import hmac
import json
import logging
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings

logger = logging.getLogger(__name__)


@dataclass
class WhatsAppSendResult:
    sent: bool
    message_id: str = ''
    status: str = ''
    error: str = ''


def normalize_whatsapp_phone(value):
    digits = ''.join(char for char in str(value or '') if char.isdigit())
    if not digits:
        return ''

    default_country = ''.join(char for char in str(settings.ALYTHA_WHATSAPP_DEFAULT_COUNTRY_CODE or '') if char.isdigit())
    if default_country and len(digits) in (10, 11) and not digits.startswith(default_country):
        digits = f'{default_country}{digits}'

    return digits


def is_whatsapp_configured():
    return bool(
        settings.ALYTHA_WHATSAPP_ENABLED
        and settings.ALYTHA_WHATSAPP_ACCESS_TOKEN
        and settings.ALYTHA_WHATSAPP_PHONE_NUMBER_ID
    )


def send_whatsapp_text_message(to_phone, body):
    to = normalize_whatsapp_phone(to_phone)
    if not to:
        return WhatsAppSendResult(sent=False, status='missing_phone', error='Telefone do destinatario nao informado.')

    if not is_whatsapp_configured():
        return WhatsAppSendResult(sent=False, status='not_configured', error='WhatsApp Cloud API nao configurada.')

    payload = {
        'messaging_product': 'whatsapp',
        'recipient_type': 'individual',
        'to': to,
        'type': 'text',
        'text': {
            'preview_url': False,
            'body': body,
        },
    }
    url = (
        f'https://graph.facebook.com/{settings.ALYTHA_WHATSAPP_GRAPH_API_VERSION}/'
        f'{settings.ALYTHA_WHATSAPP_PHONE_NUMBER_ID}/messages'
    )
    request = Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={
            'Authorization': f'Bearer {settings.ALYTHA_WHATSAPP_ACCESS_TOKEN}',
            'Content-Type': 'application/json',
        },
        method='POST',
    )

    try:
        with urlopen(request, timeout=settings.ALYTHA_WHATSAPP_TIMEOUT_SECONDS) as response:
            response_payload = json.loads(response.read().decode('utf-8') or '{}')
    except HTTPError as exc:
        error_payload = exc.read().decode('utf-8', errors='replace')
        logger.warning('WhatsApp Cloud API HTTP error: %s %s', exc.code, error_payload)
        return WhatsAppSendResult(sent=False, status='failed', error=error_payload or str(exc))
    except (URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
        logger.warning('WhatsApp Cloud API send failed: %s', exc)
        return WhatsAppSendResult(sent=False, status='failed', error=str(exc))

    message_id = ''
    messages = response_payload.get('messages') if isinstance(response_payload, dict) else None
    if isinstance(messages, list) and messages:
        message_id = str(messages[0].get('id') or '')

    return WhatsAppSendResult(sent=True, message_id=message_id, status='sent')


def build_negotiation_whatsapp_body(negotiation, sender_name, body):
    return (
        f'Alytha - Negociacao #{negotiation.id}\n'
        f'{sender_name}: {body}\n\n'
        'Responda esta mensagem para manter o historico dentro da mesa Alytha.'
    )


def send_negotiation_whatsapp_message(negotiation, recipient, sender_name, body):
    message_body = build_negotiation_whatsapp_body(negotiation, sender_name, body)
    return send_whatsapp_text_message(recipient.phone, message_body)


def verify_whatsapp_signature(raw_body, signature_header):
    app_secret = settings.ALYTHA_WHATSAPP_APP_SECRET
    if not app_secret:
        return True

    if not signature_header or not signature_header.startswith('sha256='):
        return False

    expected = 'sha256=' + hmac.new(app_secret.encode('utf-8'), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature_header)
