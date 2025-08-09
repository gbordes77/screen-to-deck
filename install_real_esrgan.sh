#!/bin/bash
# Installation de Real-ESRGAN pour super-résolution IA gratuite

echo "📦 Installation de Real-ESRGAN pour super-résolution gratuite..."

# Option 1: Via pip (plus simple)
pip3 install --user --break-system-packages basicsr
pip3 install --user --break-system-packages realesrgan

# Option 2: Télécharger le modèle pré-entraîné
mkdir -p models
cd models

# Télécharger le modèle Real-ESRGAN x4
if [ ! -f "RealESRGAN_x4plus.pth" ]; then
    echo "📥 Téléchargement du modèle Real-ESRGAN x4..."
    wget https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth
fi

cd ..

echo "✅ Installation terminée!"
echo ""
echo "Utilisation:"
echo "  python3 -m realesrgan.inference_realesrgan -n RealESRGAN_x4plus -i input.jpg -o output.jpg"