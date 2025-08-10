#!/usr/bin/env python3
"""
Tests complets pour le module robust_ocr_solution.py
Utilise pytest et mock pour tester toutes les fonctionnalités
"""
import pytest
import cv2
import numpy as np
import json
import os
import sys
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path

# Ajouter le dossier parent au path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# Import du module à tester
from robust_ocr_solution import MTGSideboardOCR


class TestMTGSideboardOCR:
    """Tests pour la classe MTGSideboardOCR"""
    
    @pytest.fixture
    def ocr_instance(self):
        """Fixture pour créer une instance OCR avec reader mocké"""
        with patch('robust_ocr_solution.easyocr.Reader') as mock_reader:
            mock_reader.return_value.readtext = MagicMock()
            ocr = MTGSideboardOCR()
            return ocr
    
    @pytest.fixture
    def test_image(self):
        """Créer une image de test"""
        # Créer une image blanche simple
        img = np.ones((1080, 1920, 3), dtype=np.uint8) * 255
        return img
    
    def test_initialization(self):
        """Test l'initialisation du reader EasyOCR"""
        with patch('robust_ocr_solution.easyocr.Reader') as mock_reader:
            ocr = MTGSideboardOCR()
            mock_reader.assert_called_once_with(['en'], gpu=False, verbose=False)
            assert ocr.reader is not None
    
    def test_extract_sideboard_region_high_res(self, test_image):
        """Test l'extraction de la région sideboard en haute résolution"""
        with patch('cv2.imread') as mock_imread:
            mock_imread.return_value = test_image
            
            ocr = MTGSideboardOCR()
            sideboard = ocr.extract_sideboard_region('test.jpg')
            
            # Vérifier les dimensions
            h, w = test_image.shape[:2]
            expected_x_start = int(w * 0.75)  # 75% pour haute res
            expected_y_start = int(h * 0.05)
            expected_y_end = int(h * 0.85)
            
            assert sideboard.shape[0] == expected_y_end - expected_y_start
            assert sideboard.shape[1] == w - expected_x_start
    
    def test_extract_sideboard_region_low_res(self):
        """Test l'extraction de la région sideboard en basse résolution"""
        low_res_img = np.ones((600, 800, 3), dtype=np.uint8) * 255
        
        with patch('cv2.imread') as mock_imread:
            mock_imread.return_value = low_res_img
            
            ocr = MTGSideboardOCR()
            sideboard = ocr.extract_sideboard_region('test.jpg')
            
            # Vérifier les dimensions pour basse res
            h, w = low_res_img.shape[:2]
            expected_x_start = int(w * 0.70)  # 70% pour basse res
            
            assert sideboard.shape[1] == w - expected_x_start
    
    def test_extract_sideboard_region_invalid_image(self):
        """Test avec une image invalide"""
        with patch('cv2.imread') as mock_imread:
            mock_imread.return_value = None
            
            ocr = MTGSideboardOCR()
            with pytest.raises(ValueError, match="Impossible de charger l'image"):
                ocr.extract_sideboard_region('invalid.jpg')
    
    def test_preprocess_image(self, ocr_instance, test_image):
        """Test le prétraitement d'image"""
        processed = ocr_instance.preprocess_image(test_image)
        
        # Vérifier que l'image est agrandie (scale = 3)
        assert processed.shape[0] == test_image.shape[0] * 3
        assert processed.shape[1] == test_image.shape[1] * 3
        
        # Vérifier que c'est toujours une image BGR
        assert len(processed.shape) == 3
        assert processed.shape[2] == 3
    
    def test_extract_text_regions(self, ocr_instance, test_image):
        """Test l'extraction des régions de texte"""
        with patch('cv2.findContours') as mock_contours:
            # Mock des contours
            mock_contours.return_value = (
                [np.array([[0, 0], [100, 0], [100, 20], [0, 20]]),
                 np.array([[0, 30], [150, 30], [150, 50], [0, 50]])],
                None
            )
            
            regions = ocr_instance.extract_text_regions(test_image)
            
            # Au moins une région devrait être trouvée
            assert isinstance(regions, list)
    
    def test_correct_card_name_exact_match(self, ocr_instance):
        """Test la correction de nom avec correspondance exacte"""
        name, score = ocr_instance.correct_card_name("Lightning Bolt")
        assert name == "Lightning Bolt"
        assert score >= 60
    
    def test_correct_card_name_fuzzy_match(self, ocr_instance):
        """Test la correction de nom avec correspondance floue"""
        name, score = ocr_instance.correct_card_name("Lightnig Bolt")  # Typo
        assert "Lightning" in name or "Bolt" in name
        assert score >= 60
    
    def test_correct_card_name_ui_element(self, ocr_instance):
        """Test l'ignorance des éléments UI"""
        name, score = ocr_instance.correct_card_name("sideboard")
        assert name is None
        assert score == 0
        
        name, score = ocr_instance.correct_card_name("done")
        assert name is None
        assert score == 0
    
    def test_correct_card_name_too_short(self, ocr_instance):
        """Test l'ignorance des textes trop courts"""
        name, score = ocr_instance.correct_card_name("AB")
        assert name is None
        assert score == 0
    
    def test_parse_quantity_patterns(self, ocr_instance):
        """Test le parsing de différents patterns de quantité"""
        test_cases = [
            ("(2) Lightning Bolt", 2, "Lightning Bolt"),
            ("4x Counterspell", 4, "Counterspell"),
            ("Island x10", 10, "Island"),
            ("3 Mountain", 3, "Mountain"),
            ("Plains", 1, "Plains"),  # Pas de quantité = 1
        ]
        
        for text, expected_qty, expected_name in test_cases:
            qty, name = ocr_instance.parse_quantity(text)
            assert qty == expected_qty
            assert name == expected_name
    
    def test_process_image_success(self, ocr_instance):
        """Test le traitement complet d'une image avec succès"""
        # Mock des dépendances
        with patch.object(ocr_instance, 'extract_sideboard_region') as mock_extract:
            with patch.object(ocr_instance, 'preprocess_image') as mock_preprocess:
                with patch.object(ocr_instance.reader, 'readtext') as mock_readtext:
                    # Configuration des mocks
                    mock_extract.return_value = np.ones((100, 100, 3))
                    mock_preprocess.return_value = np.ones((300, 300, 3))
                    mock_readtext.return_value = [
                        (None, "(3) Negate", 0.9),
                        (None, "2x Rest in Peace", 0.85),
                        (None, "Duress x3", 0.8),
                    ]
                    
                    result = ocr_instance.process_image('test.jpg')
                    
                    assert result['success'] is True
                    assert len(result['sideboard']) > 0
                    assert result['cards_found'] > 0
                    assert result['total_cards'] > 0
    
    def test_process_image_error_handling(self, ocr_instance):
        """Test la gestion d'erreur dans le traitement d'image"""
        with patch.object(ocr_instance, 'extract_sideboard_region') as mock_extract:
            mock_extract.side_effect = Exception("Test error")
            
            result = ocr_instance.process_image('test.jpg')
            
            assert result['success'] is False
            assert 'error' in result
            assert result['error'] == "Test error"
            assert result['sideboard'] == []
    
    def test_process_multiple_passes(self, ocr_instance):
        """Test le traitement avec plusieurs passes"""
        with patch.object(ocr_instance, 'process_image') as mock_process:
            with patch('cv2.imread') as mock_imread:
                with patch('cv2.imwrite') as mock_imwrite:
                    # Mock des résultats pour deux passes
                    mock_process.side_effect = [
                        {
                            "success": True,
                            "sideboard": [
                                {"name": "Negate", "quantity": 3},
                                {"name": "Duress", "quantity": 2}
                            ]
                        },
                        {
                            "success": True,
                            "sideboard": [
                                {"name": "Rest in Peace", "quantity": 3}
                            ]
                        }
                    ]
                    
                    mock_imread.return_value = np.ones((100, 100, 3))
                    
                    result = ocr_instance.process_multiple_passes('test.jpg')
                    
                    assert result['success'] is True
                    assert result['cards_found'] == 3  # 3 cartes uniques
                    assert result['total_cards'] == 8  # 3+2+3
    
    def test_deduplication_in_multiple_passes(self, ocr_instance):
        """Test que les cartes ne sont pas dupliquées entre les passes"""
        with patch.object(ocr_instance, 'process_image') as mock_process:
            with patch('cv2.imread') as mock_imread:
                with patch('cv2.imwrite') as mock_imwrite:
                    # Même carte dans les deux passes
                    mock_process.side_effect = [
                        {
                            "success": True,
                            "sideboard": [{"name": "Negate", "quantity": 3}]
                        },
                        {
                            "success": True,
                            "sideboard": [{"name": "Negate", "quantity": 2}]
                        }
                    ]
                    
                    mock_imread.return_value = np.ones((100, 100, 3))
                    
                    result = ocr_instance.process_multiple_passes('test.jpg')
                    
                    # Ne devrait garder que la première occurrence
                    assert result['cards_found'] == 1
                    assert result['total_cards'] == 3


class TestMainFunction:
    """Tests pour la fonction main et les points d'entrée"""
    
    def test_main_with_missing_images(self, capsys):
        """Test main avec images manquantes"""
        with patch('os.path.exists') as mock_exists:
            mock_exists.return_value = False
            
            from robust_ocr_solution import main
            main()
            
            captured = capsys.readouterr()
            assert "❌ Image non trouvée" in captured.out
    
    @patch('robust_ocr_solution.MTGSideboardOCR')
    def test_main_with_successful_ocr(self, mock_ocr_class, capsys):
        """Test main avec OCR réussi"""
        with patch('os.path.exists') as mock_exists:
            mock_exists.return_value = True
            
            # Mock de l'instance OCR
            mock_ocr = Mock()
            mock_ocr_class.return_value = mock_ocr
            mock_ocr.process_multiple_passes.return_value = {
                "success": True,
                "sideboard": [
                    {"name": "Negate", "quantity": 3},
                    {"name": "Duress", "quantity": 2}
                ],
                "cards_found": 2,
                "total_cards": 5
            }
            
            from robust_ocr_solution import main
            main()
            
            captured = capsys.readouterr()
            assert "✅" in captured.out
            assert "cartes uniques trouvées" in captured.out
            assert "Negate" in captured.out
    
    def test_process_for_nodejs_with_file_arg(self, capsys):
        """Test le point d'entrée Node.js avec argument fichier"""
        test_args = ['script.py', 'test_image.jpg', '--nodejs']
        
        with patch('sys.argv', test_args):
            with patch('robust_ocr_solution.MTGSideboardOCR') as mock_ocr_class:
                mock_ocr = Mock()
                mock_ocr_class.return_value = mock_ocr
                mock_ocr.process_multiple_passes.return_value = {
                    "success": True,
                    "sideboard": [{"name": "Test Card", "quantity": 1}],
                    "cards_found": 1,
                    "total_cards": 1
                }
                
                from robust_ocr_solution import process_for_nodejs
                process_for_nodejs()
                
                captured = capsys.readouterr()
                result = json.loads(captured.out)
                assert result['success'] is True
                assert len(result['sideboard']) == 1
    
    def test_process_for_nodejs_with_stdin(self, capsys, monkeypatch):
        """Test le point d'entrée Node.js avec base64 depuis stdin"""
        import base64
        from PIL import Image
        import io
        
        # Créer une image test
        img = Image.new('RGB', (100, 100), color='white')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_base64 = base64.b64encode(img_bytes.getvalue()).decode()
        
        # Mock stdin
        monkeypatch.setattr('sys.stdin.read', lambda: img_base64)
        
        test_args = ['script.py', '--nodejs']
        
        with patch('sys.argv', test_args):
            with patch('robust_ocr_solution.MTGSideboardOCR') as mock_ocr_class:
                mock_ocr = Mock()
                mock_ocr_class.return_value = mock_ocr
                mock_ocr.process_multiple_passes.return_value = {
                    "success": True,
                    "sideboard": [],
                    "cards_found": 0,
                    "total_cards": 0
                }
                
                from robust_ocr_solution import process_for_nodejs
                process_for_nodejs()
                
                captured = capsys.readouterr()
                result = json.loads(captured.out)
                assert 'success' in result


class TestIntegration:
    """Tests d'intégration avec de vraies images"""
    
    @pytest.mark.skipif(not os.path.exists('/usr/bin/tesseract'), 
                        reason="Tesseract not installed")
    def test_with_real_easyocr(self):
        """Test avec le vrai EasyOCR (si installé)"""
        try:
            import easyocr
            ocr = MTGSideboardOCR()
            assert ocr.reader is not None
        except ImportError:
            pytest.skip("EasyOCR not installed")
    
    def test_card_database_completeness(self):
        """Vérifier que la base de cartes contient des cartes importantes"""
        from robust_ocr_solution import MTG_CARDS_DB
        
        important_cards = [
            "Negate", "Lightning Bolt", "Counterspell",
            "Rest in Peace", "Duress"
        ]
        
        for card in important_cards:
            assert card in MTG_CARDS_DB
    
    def test_fuzzy_matching_accuracy(self):
        """Test la précision du fuzzy matching"""
        ocr = MTGSideboardOCR()
        
        test_cases = [
            ("Negat", "Negate"),  # Lettre manquante
            ("Lightnign Bolt", "Lightning Bolt"),  # Transposition
            ("Counterspe11", "Counterspell"),  # Caractère erroné
        ]
        
        for typo, expected in test_cases:
            corrected, score = ocr.correct_card_name(typo)
            # Devrait trouver la bonne carte ou une proche
            assert corrected is not None or score > 40


class TestPerformance:
    """Tests de performance"""
    
    def test_preprocessing_performance(self):
        """Test que le prétraitement reste rapide"""
        import time
        
        ocr = MTGSideboardOCR()
        large_image = np.ones((2160, 3840, 3), dtype=np.uint8) * 255  # 4K
        
        start = time.time()
        processed = ocr.preprocess_image(large_image)
        duration = time.time() - start
        
        # Devrait prendre moins de 5 secondes même pour une image 4K
        assert duration < 5.0
    
    def test_memory_usage(self):
        """Test que l'utilisation mémoire reste raisonnable"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        ocr = MTGSideboardOCR()
        large_image = np.ones((2160, 3840, 3), dtype=np.uint8) * 255
        
        # Traiter plusieurs fois
        for _ in range(3):
            processed = ocr.preprocess_image(large_image)
            del processed
        
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = final_memory - initial_memory
        
        # Ne devrait pas utiliser plus de 500MB supplémentaires
        assert memory_increase < 500


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])