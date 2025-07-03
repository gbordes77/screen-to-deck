# Dockerfile - Version production optimisée
FROM python:3.11-slim as builder

WORKDIR /app

# Dépendances système pour OCR
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    wget \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copie requirements
COPY requirements-frozen.txt .

# Environnement virtuel
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir -r requirements-frozen.txt

# --- Image finale ---
FROM python:3.11-slim

WORKDIR /app

# Dépendances runtime seulement
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copie venv depuis builder
COPY --from=builder /opt/venv /opt/venv

# Copie application
COPY . .

# Variables d'environnement
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s \
    CMD python -c "import discord; import easyocr" || exit 1

CMD ["python", "bot.py"] 