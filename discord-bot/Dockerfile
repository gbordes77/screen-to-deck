FROM python:3.11-slim

# 📦 Install system dependencies including Tesseract OCR
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-fra \
    tesseract-ocr-eng \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgstreamer1.0-0 \
    libgstreamer-plugins-base1.0-0 \
    libgtk-3-0 \
    wget \
    && rm -rf /var/lib/apt/lists/*

# 🔧 Set working directory
WORKDIR /app

# 📋 Copy requirements first for better Docker layer caching
COPY requirements.txt .

# 🚀 Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 📁 Copy application code
COPY . .

# 👤 Create non-root user for security
RUN useradd --create-home --shell /bin/bash mtgbot && \
    chown -R mtgbot:mtgbot /app

USER mtgbot

# 🔒 Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# 🏃 Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import asyncio; import aiohttp; asyncio.run(aiohttp.ClientSession().get('https://discord.com/api/v10/gateway').close())" || exit 1

# 🎯 Default command
CMD ["python", "bot.py"] 