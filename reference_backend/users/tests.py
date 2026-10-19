import io
import os
from pathlib import Path
import secrets
import subprocess
import sys

from django.core.management import call_command
from django.test import SimpleTestCase, TestCase

from .models import User


class SettingsSecurityTests(SimpleTestCase):
    def load_settings(self, **values):
        env = {key: value for key, value in os.environ.items()
               if key not in {'SECRET_KEY', 'DEBUG', 'ALLOWED_HOSTS'}}
        env.update(values)
        return subprocess.run(
            [sys.executable, '-c',
             'from config import settings; '
             'print(settings.DEBUG); print(settings.ALLOWED_HOSTS)'],
            cwd=Path(__file__).resolve().parents[1], env=env,
            capture_output=True, text=True, timeout=15,
        )

    def test_signing_key_must_be_supplied(self):
        for value in (None, '', '   '):
            with self.subTest(value=value):
                result = self.load_settings(**({} if value is None else {'SECRET_KEY': value}))
                self.assertNotEqual(result.returncode, 0)
                self.assertIn('SECRET_KEY', result.stderr)

    def test_defaults_disable_debug_and_limit_hosts(self):
        result = self.load_settings(SECRET_KEY=secrets.token_urlsafe(64))
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.splitlines(), ['False', "['localhost', '127.0.0.1', '[::1]']"])


class SeedSecurityTests(TestCase):
    def test_seeded_profiles_cannot_authenticate_until_password_is_set(self):
        call_command('seed', stdout=io.StringIO())
        self.assertTrue(User.objects.exists())
        for user in User.objects.all():
            with self.subTest(username=user.username):
                self.assertFalse(user.has_usable_password())

        user = User.objects.first()
        chosen_password = secrets.token_urlsafe(32)
        response = self.client.post('/api/users/login/', {
            'email': user.email, 'password': chosen_password,
        })
        self.assertEqual(response.status_code, 401)
        user.set_password(chosen_password)
        user.save()
        response = self.client.post('/api/users/login/', {
            'email': user.email, 'password': chosen_password,
        })
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.json())
