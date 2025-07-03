import sys
import pkg_resources

print("🐍 Vérification de l'environnement Python...")
print(f"Version Python: {sys.version}")

REQUIRED_PACKAGES = [
    "discord.py",
    "easyocr",
    "opencv-python-headless",
    "Pillow",
    "scikit-image",
    "torch",
    "torchvision",
    "numpy",
]

has_errors = False
for package in REQUIRED_PACKAGES:
    try:
        dist = pkg_resources.get_distribution(package.split('==')[0])
        print(f"✅ {dist.project_name} version {dist.version} trouvé.")
    except pkg_resources.DistributionNotFound:
        print(f"❌ ERREUR: Le paquet '{package}' est manquant.")
        has_errors = True
    except ImportError as e:
        print(f"❌ ERREUR: Impossible d'importer '{package}': {e}")
        has_errors = True

if has_errors:
    print("\n⚠️  Validation de l'environnement échouée. Veuillez réinstaller les dépendances.")
    sys.exit(1)
else:
    print("\n✨ Environnement validé avec succès!") 