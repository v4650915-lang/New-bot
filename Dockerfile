FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if needed (e.g. for sqlite)
# RUN apt-get update && apt-get install -y ...

# Copy requirements first to leverage cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Environment variables will be passed via docker-compose
CMD ["python", "main.py"]
