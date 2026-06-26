PYTHON = .venv/bin/python
PIP    = .venv/bin/pip

.PHONY: install run migrate makemigrations superuser shell test

install:
	python3 -m venv .venv
	$(PIP) install -r requirements.txt

run:
	$(PYTHON) manage.py runserver

migrate:
	$(PYTHON) manage.py migrate

makemigrations:
	$(PYTHON) manage.py makemigrations

superuser:
	$(PYTHON) manage.py createsuperuser

shell:
	$(PYTHON) manage.py shell

test:
	$(PYTHON) manage.py test
