#!/usr/bin/env python3

"""
Comprehensive End-to-End Integration Test for Discord Bot
NO MOCKS - Real OCR processing with EasyOCR
Tests the COMPLETE flow: Image → OCR → Validation → Export
Compares results with web service for consistency
"""

import asyncio
import json
import os
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from datetime import datetime
import tracemalloc

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.ocr_parser_easyocr import OCRParser
from services.scryfall_service import ScryfallService
from services.export_service import ExportService
from services.deck_guarantee_service import DeckGuaranteeService

# Configuration
VALIDATED_IMAGES_DIR = Path(__file__).parent.parent.parent.parent / "validated_decklists"
REPORTS_DIR = Path(__file__).parent / "reports"
REPORTS_DIR.mkdir(exist_ok=True)

# Test images matching web service tests
TEST_IMAGES = [
    # MTGA
    {"category": "MTGA", "file": "MTGA deck list 4_1920x1080.jpeg", "description": "High resolution MTGA"},
    {"category": "MTGA", "file": "MTGA deck list special_1334x886.jpeg", "description": "Special case MTGA"},
    
    # MTGO
    {"category": "MTGO", "file": "MTGO deck list usual_1763x791.jpeg", "description": "Standard MTGO"},
    {"category": "MTGO", "file": "MTGO deck list usual 4_1254x432.jpeg", "description": "Low height MTGO"},
    
    # MTGGoldfish
    {"category": "MTGGoldfish", "file": "mtggoldfish deck list 2_1383x1518.jpg", "description": "High res MTGGoldfish"},
    {"category": "MTGGoldfish", "file": "mtggoldfish deck list 10_1239x1362.jpg", "description": "Standard MTGGoldfish"},
    
    # Paper/Physical
    {"category": "Paper", "file": "real deck paper cards 4_2336x1098.jpeg", "description": "Physical cards photo"},
    {"category": "Paper", "file": "real deck cartes cachés_2048x1542.jpeg", "description": "Partially hidden cards"},
    
    # Website
    {"category": "Website", "file": "web site  deck list_2300x2210.jpeg", "description": "Large website screenshot"}
]

# Export formats to test
EXPORT_FORMATS = ["mtga", "moxfield", "archidekt", "tappedout", "text"]

@dataclass
class TestResult:
    """Test result for a single image"""
    image: Dict[str, str]
    success: bool
    start_time: float
    end_time: float
    duration: float
    memory_start: float
    memory_end: float
    memory_used: float
    mainboard_count: int
    sideboard_count: int
    total_cards: int
    unique_cards: int
    ocr_raw_text: str = ""
    ocr_cards: List[Dict] = None
    validated_cards: List[str] = None
    invalid_cards: List[str] = None
    ocr_accuracy: float = 0.0
    export_results: Dict[str, bool] = None
    processing_steps: Dict[str, float] = None
    errors: List[str] = None
    warnings: List[str] = None
    
    def __post_init__(self):
        if self.ocr_cards is None:
            self.ocr_cards = []
        if self.validated_cards is None:
            self.validated_cards = []
        if self.invalid_cards is None:
            self.invalid_cards = []
        if self.export_results is None:
            self.export_results = {}
        if self.processing_steps is None:
            self.processing_steps = {}
        if self.errors is None:
            self.errors = []
        if self.warnings is None:
            self.warnings = []


class DiscordBotE2ETester:
    """End-to-end tester for Discord bot OCR pipeline"""
    
    def __init__(self):
        self.ocr_parser = OCRParser()
        self.scryfall_service = ScryfallService()
        self.export_service = ExportService()
        self.guarantee_service = DeckGuaranteeService()
        self.results: List[TestResult] = []
        self.start_time = 0
        
    async def run(self):
        """Run all E2E tests"""
        print("\n" + "="*60)
        print(" MTG Discord Bot E2E Integration Tests")
        print(" NO MOCKS - Real EasyOCR Processing")
        print("="*60 + "\n")
        
        self.start_time = time.time()
        
        try:
            # Initialize services
            await self.initialize_services()
            
            # Run tests
            await self.run_all_tests()
            
            # Generate reports
            self.generate_reports()
            
            # Compare with web service (if results available)
            await self.compare_with_web_service()
            
        except Exception as e:
            print(f"\n❌ Fatal error: {e}")
            traceback.print_exc()
            sys.exit(1)
            
    async def initialize_services(self):
        """Initialize all services"""
        print("🔧 Initializing services...")
        
        # Initialize OCR (this loads the model)
        print("  Loading EasyOCR model...")
        # The OCRParser initializes in __init__
        
        # Test Scryfall connection
        print("  Testing Scryfall API...")
        test_card = await self.scryfall_service.search_card("Lightning Bolt")
        if not test_card:
            raise Exception("Failed to connect to Scryfall API")
            
        print("✅ All services initialized\n")
        
    async def run_all_tests(self):
        """Run tests on all images"""
        total = len(TEST_IMAGES)
        
        for i, test_image in enumerate(TEST_IMAGES, 1):
            print(f"[{i}/{total}] Testing: {test_image['file']}")
            print(f"     Category: {test_image['category']}")
            print(f"     Description: {test_image['description']}")
            
            result = await self.run_single_test(test_image)
            self.results.append(result)
            
            if result.success:
                print(f"     ✅ PASSED ({result.duration:.0f}ms)")
            else:
                print(f"     ❌ FAILED")
                for error in result.errors:
                    print(f"       Error: {error}")
            print()
            
    async def run_single_test(self, test_image: Dict[str, str]) -> TestResult:
        """Run a complete test on a single image"""
        result = TestResult(
            image=test_image,
            success=False,
            start_time=time.time(),
            end_time=0,
            duration=0,
            memory_start=0,
            memory_end=0,
            memory_used=0,
            mainboard_count=0,
            sideboard_count=0,
            total_cards=0,
            unique_cards=0
        )
        
        # Start memory tracking
        tracemalloc.start()
        result.memory_start = tracemalloc.get_traced_memory()[0] / 1024 / 1024  # MB
        
        image_path = VALIDATED_IMAGES_DIR / test_image["file"]
        
        try:
            # Check if image exists
            if not image_path.exists():
                raise FileNotFoundError(f"Image not found: {image_path}")
                
            file_size = image_path.stat().st_size / 1024 / 1024  # MB
            print(f"     Image size: {file_size:.2f} MB")
            
            # Step 1: OCR Processing
            print("     1️⃣ Running EasyOCR...")
            ocr_start = time.time()
            
            ocr_result = await self.ocr_parser.process_image(str(image_path))
            
            result.processing_steps["ocr"] = time.time() - ocr_start
            
            if not ocr_result or "cards" not in ocr_result:
                raise ValueError("OCR returned no cards")
                
            result.ocr_cards = ocr_result["cards"]
            result.ocr_raw_text = ocr_result.get("raw_text", "")
            result.unique_cards = len(result.ocr_cards)
            
            print(f"     ✅ OCR completed ({result.processing_steps['ocr']:.1f}s)")
            
            # Step 2: Apply 60+15 Guarantee
            print("     2️⃣ Applying card guarantee...")
            guarantee_start = time.time()
            
            guaranteed_cards = self.guarantee_service.ensure_legal_deck(result.ocr_cards)
            result.ocr_cards = guaranteed_cards
            
            result.processing_steps["guarantee"] = time.time() - guarantee_start
            
            # Count cards
            mainboard = [c for c in result.ocr_cards if c.get("section") != "sideboard"]
            sideboard = [c for c in result.ocr_cards if c.get("section") == "sideboard"]
            
            result.mainboard_count = sum(c.get("quantity", 0) for c in mainboard)
            result.sideboard_count = sum(c.get("quantity", 0) for c in sideboard)
            result.total_cards = result.mainboard_count + result.sideboard_count
            
            print(f"     📊 Cards: {result.mainboard_count} main + {result.sideboard_count} side = {result.total_cards} total")
            
            # Verify 60+15
            if result.mainboard_count != 60:
                result.errors.append(f"Mainboard is {result.mainboard_count}, expected 60")
            if result.sideboard_count != 15:
                result.errors.append(f"Sideboard is {result.sideboard_count}, expected 15")
                
            # Step 3: Validate with Scryfall
            print("     3️⃣ Validating cards...")
            validation_start = time.time()
            
            validated = []
            invalid = []
            
            for card in result.ocr_cards:
                card_name = card.get("name", "")
                if card_name:
                    # Try to find card on Scryfall
                    scryfall_card = await self.scryfall_service.search_card(card_name)
                    if scryfall_card:
                        validated.append(scryfall_card.get("name", card_name))
                    else:
                        invalid.append(card_name)
                        
            result.validated_cards = validated
            result.invalid_cards = invalid
            
            result.processing_steps["validation"] = time.time() - validation_start
            
            # Calculate accuracy
            total_unique = len(set(c.get("name", "") for c in result.ocr_cards if c.get("name")))
            if total_unique > 0:
                result.ocr_accuracy = (len(validated) / total_unique) * 100
                
            print(f"     📈 OCR Accuracy: {result.ocr_accuracy:.1f}%")
            
            if invalid:
                result.warnings.append(f"{len(invalid)} invalid cards: {', '.join(invalid[:5])}")
                
            # Step 4: Test Export Formats
            print("     4️⃣ Testing export formats...")
            export_start = time.time()
            
            for format_name in EXPORT_FORMATS:
                try:
                    if format_name == "mtga":
                        export_text = self.export_service.export_to_mtga(result.ocr_cards)
                    elif format_name == "moxfield":
                        export_text = self.export_service.export_to_moxfield(result.ocr_cards)
                    elif format_name == "archidekt":
                        export_text = self.export_service.export_to_archidekt(result.ocr_cards)
                    elif format_name == "tappedout":
                        export_text = self.export_service.export_to_tappedout(result.ocr_cards)
                    else:
                        export_text = self.export_service.export_to_text(result.ocr_cards)
                        
                    if export_text:
                        result.export_results[format_name] = True
                    else:
                        result.export_results[format_name] = False
                        result.warnings.append(f"Export {format_name} returned empty")
                        
                except Exception as e:
                    result.export_results[format_name] = False
                    result.warnings.append(f"Export {format_name} failed: {str(e)}")
                    
            result.processing_steps["export"] = time.time() - export_start
            
            export_success = sum(1 for v in result.export_results.values() if v)
            print(f"     ✅ Export formats: {export_success}/{len(EXPORT_FORMATS)} successful")
            
            # Calculate final metrics
            result.end_time = time.time()
            result.duration = (result.end_time - result.start_time) * 1000  # ms
            
            # Memory usage
            current_memory = tracemalloc.get_traced_memory()[0] / 1024 / 1024
            result.memory_end = current_memory
            result.memory_used = current_memory - result.memory_start
            tracemalloc.stop()
            
            # Determine success
            result.success = (
                result.mainboard_count == 60 and
                result.sideboard_count == 15 and
                len(result.errors) == 0
            )
            
            print(f"     ⏱️ Total time: {result.duration:.0f}ms")
            print(f"     💾 Memory used: {result.memory_used:.2f} MB")
            
        except Exception as e:
            result.errors.append(str(e))
            result.end_time = time.time()
            result.duration = (result.end_time - result.start_time) * 1000
            tracemalloc.stop()
            
        return result
        
    def generate_reports(self):
        """Generate comprehensive test reports"""
        total_duration = time.time() - self.start_time
        
        print("\n" + "="*60)
        print(" TEST EXECUTION SUMMARY")
        print("="*60)
        
        # Calculate statistics
        total_tests = len(self.results)
        successful_tests = sum(1 for r in self.results if r.success)
        failed_tests = total_tests - successful_tests
        success_rate = (successful_tests / total_tests * 100) if total_tests > 0 else 0
        
        # Group by category
        by_category = {}
        for result in self.results:
            category = result.image["category"]
            if category not in by_category:
                by_category[category] = []
            by_category[category].append(result)
            
        # Category summary
        print("\n📊 Results by Category:")
        for category, results in by_category.items():
            cat_success = sum(1 for r in results if r.success)
            cat_total = len(results)
            avg_time = sum(r.duration for r in results) / cat_total if cat_total > 0 else 0
            avg_accuracy = sum(r.ocr_accuracy for r in results) / cat_total if cat_total > 0 else 0
            
            print(f"\n  {category}:")
            print(f"    Status: {cat_success}/{cat_total} passed")
            print(f"    Avg Time: {avg_time:.0f}ms")
            print(f"    Avg Accuracy: {avg_accuracy:.1f}%")
            
        # Overall statistics
        print(f"\n📈 Overall Statistics:")
        print(f"  Total Tests: {total_tests}")
        print(f"  Passed: {successful_tests}")
        print(f"  Failed: {failed_tests}")
        print(f"  Success Rate: {success_rate:.1f}%")
        print(f"  Total Duration: {total_duration:.1f}s")
        
        # Performance metrics
        if self.results:
            avg_duration = sum(r.duration for r in self.results) / len(self.results)
            avg_memory = sum(r.memory_used for r in self.results) / len(self.results)
            avg_accuracy = sum(r.ocr_accuracy for r in self.results) / len(self.results)
            
            print(f"\n⚡ Performance Metrics:")
            print(f"  Avg Processing Time: {avg_duration:.0f}ms")
            print(f"  Avg Memory Usage: {avg_memory:.2f} MB")
            print(f"  Avg OCR Accuracy: {avg_accuracy:.1f}%")
            
            # Processing step breakdown
            print(f"\n⏱️ Processing Step Breakdown:")
            steps = ["ocr", "guarantee", "validation", "export"]
            for step in steps:
                step_times = [r.processing_steps.get(step, 0) for r in self.results if step in r.processing_steps]
                if step_times:
                    avg_step_time = sum(step_times) / len(step_times)
                    print(f"  {step.capitalize()}: {avg_step_time:.1f}s avg")
                    
        # 60+15 Guarantee Check
        all_60_15 = all(
            r.mainboard_count == 60 and r.sideboard_count == 15
            for r in self.results
        )
        
        print(f"\n🃏 Card Count Validation:")
        if all_60_15:
            print(f"  ✅ ALL tests maintained 60+15 guarantee")
        else:
            print(f"  ❌ Some tests failed 60+15 guarantee:")
            for r in self.results:
                if r.mainboard_count != 60 or r.sideboard_count != 15:
                    print(f"    - {r.image['file']}: {r.mainboard_count}+{r.sideboard_count}")
                    
        # Export format success
        print(f"\n📦 Export Format Success:")
        for format_name in EXPORT_FORMATS:
            format_success = sum(1 for r in self.results if r.export_results.get(format_name, False))
            format_rate = (format_success / total_tests * 100) if total_tests > 0 else 0
            print(f"  {format_name}: {format_success}/{total_tests} ({format_rate:.0f}%)")
            
        # Failed tests
        if failed_tests > 0:
            print(f"\n❌ Failed Tests:")
            for r in self.results:
                if not r.success:
                    print(f"\n  {r.image['file']}:")
                    for error in r.errors:
                        print(f"    Error: {error}")
                        
        # Save JSON report
        report_data = {
            "summary": {
                "total_tests": total_tests,
                "successful_tests": successful_tests,
                "failed_tests": failed_tests,
                "success_rate": success_rate,
                "total_duration": total_duration,
                "all_60_15": all_60_15,
                "timestamp": datetime.now().isoformat()
            },
            "by_category": {
                category: {
                    "tests": len(results),
                    "passed": sum(1 for r in results if r.success),
                    "avg_time": sum(r.duration for r in results) / len(results) if results else 0,
                    "avg_accuracy": sum(r.ocr_accuracy for r in results) / len(results) if results else 0
                }
                for category, results in by_category.items()
            },
            "results": [
                {
                    "file": r.image["file"],
                    "category": r.image["category"],
                    "success": r.success,
                    "duration": r.duration,
                    "memory": r.memory_used,
                    "mainboard": r.mainboard_count,
                    "sideboard": r.sideboard_count,
                    "accuracy": r.ocr_accuracy,
                    "exports": r.export_results,
                    "errors": r.errors,
                    "warnings": r.warnings
                }
                for r in self.results
            ]
        }
        
        report_path = REPORTS_DIR / f"discord_bot_report_{int(time.time())}.json"
        with open(report_path, "w") as f:
            json.dump(report_data, f, indent=2)
            
        print(f"\n📄 Report saved to: {report_path}")
        
        # Final assessment
        print(f"\n{'='*60}")
        print(" FINAL ASSESSMENT")
        print("="*60)
        
        if success_rate == 100 and all_60_15:
            print("✅ DISCORD BOT READY FOR PRODUCTION")
            print("  All tests passed with 60+15 guarantee maintained")
        elif success_rate >= 90:
            print("⚠️ DISCORD BOT MOSTLY READY")
            print("  Minor issues need addressing before production")
        else:
            print("❌ DISCORD BOT NOT READY")
            print("  Critical issues must be resolved")
            
    async def compare_with_web_service(self):
        """Compare Discord bot results with web service results"""
        print(f"\n{'='*60}")
        print(" WEB SERVICE vs DISCORD BOT COMPARISON")
        print("="*60)
        
        # Look for web service report
        web_reports = list(Path(__file__).parent.parent.parent / "server" / "tests" / "integration" / "reports").glob("report-*.json")
        
        if not web_reports:
            print("\n⚠️ No web service reports found for comparison")
            return
            
        # Use most recent web report
        latest_web_report = max(web_reports, key=lambda p: p.stat().st_mtime)
        
        with open(latest_web_report) as f:
            web_data = json.load(f)
            
        print(f"\n📊 Comparing with web service report: {latest_web_report.name}")
        
        # Compare overall metrics
        print("\n📈 Overall Comparison:")
        print(f"  {'Metric':<25} {'Web Service':<15} {'Discord Bot':<15} {'Difference'}")
        print("  " + "-"*70)
        
        web_success_rate = web_data["summary"]["successRate"]
        bot_success_rate = (sum(1 for r in self.results if r.success) / len(self.results) * 100) if self.results else 0
        
        print(f"  {'Success Rate:':<25} {web_success_rate:.1f}%{'':<10} {bot_success_rate:.1f}%{'':<10} {abs(web_success_rate - bot_success_rate):.1f}%")
        
        web_avg_time = web_data["summary"]["avgDuration"]
        bot_avg_time = sum(r.duration for r in self.results) / len(self.results) if self.results else 0
        
        print(f"  {'Avg Processing Time:':<25} {web_avg_time:.0f}ms{'':<10} {bot_avg_time:.0f}ms{'':<10} {abs(web_avg_time - bot_avg_time):.0f}ms")
        
        web_avg_accuracy = web_data["summary"]["avgAccuracy"]
        bot_avg_accuracy = sum(r.ocr_accuracy for r in self.results) / len(self.results) if self.results else 0
        
        print(f"  {'Avg OCR Accuracy:':<25} {web_avg_accuracy:.1f}%{'':<10} {bot_avg_accuracy:.1f}%{'':<10} {abs(web_avg_accuracy - bot_avg_accuracy):.1f}%")
        
        # Compare by image
        print("\n📷 Per-Image Comparison:")
        
        web_results_by_file = {r["file"]: r for r in web_data["results"]}
        
        comparison_data = []
        for bot_result in self.results:
            file_name = bot_result.image["file"]
            web_result = web_results_by_file.get(file_name)
            
            if web_result:
                print(f"\n  {file_name}:")
                print(f"    Success: Web={web_result['success']}, Bot={bot_result.success}")
                print(f"    Time: Web={web_result['duration']:.0f}ms, Bot={bot_result.duration:.0f}ms")
                print(f"    Accuracy: Web={web_result['accuracy']:.1f}%, Bot={bot_result.ocr_accuracy:.1f}%")
                
                comparison_data.append({
                    "file": file_name,
                    "web_success": web_result["success"],
                    "bot_success": bot_result.success,
                    "web_time": web_result["duration"],
                    "bot_time": bot_result.duration,
                    "web_accuracy": web_result["accuracy"],
                    "bot_accuracy": bot_result.ocr_accuracy,
                    "time_diff": abs(web_result["duration"] - bot_result.duration),
                    "accuracy_diff": abs(web_result["accuracy"] - bot_result.ocr_accuracy)
                })
                
        # Summary statistics
        if comparison_data:
            avg_time_diff = sum(c["time_diff"] for c in comparison_data) / len(comparison_data)
            avg_accuracy_diff = sum(c["accuracy_diff"] for c in comparison_data) / len(comparison_data)
            
            print(f"\n📊 Comparison Summary:")
            print(f"  Average time difference: {avg_time_diff:.0f}ms")
            print(f"  Average accuracy difference: {avg_accuracy_diff:.1f}%")
            
            # Identify which service is faster/more accurate
            web_faster = sum(1 for c in comparison_data if c["web_time"] < c["bot_time"])
            bot_faster = sum(1 for c in comparison_data if c["bot_time"] < c["web_time"])
            
            web_more_accurate = sum(1 for c in comparison_data if c["web_accuracy"] > c["bot_accuracy"])
            bot_more_accurate = sum(1 for c in comparison_data if c["bot_accuracy"] > c["web_accuracy"])
            
            print(f"\n  Speed comparison:")
            print(f"    Web faster: {web_faster}/{len(comparison_data)} images")
            print(f"    Bot faster: {bot_faster}/{len(comparison_data)} images")
            
            print(f"\n  Accuracy comparison:")
            print(f"    Web more accurate: {web_more_accurate}/{len(comparison_data)} images")
            print(f"    Bot more accurate: {bot_more_accurate}/{len(comparison_data)} images")
            
            # Save comparison report
            comparison_report = {
                "timestamp": datetime.now().isoformat(),
                "web_report": str(latest_web_report),
                "summary": {
                    "avg_time_diff": avg_time_diff,
                    "avg_accuracy_diff": avg_accuracy_diff,
                    "web_faster_count": web_faster,
                    "bot_faster_count": bot_faster,
                    "web_more_accurate_count": web_more_accurate,
                    "bot_more_accurate_count": bot_more_accurate
                },
                "detailed_comparison": comparison_data
            }
            
            comparison_path = REPORTS_DIR / f"comparison_{int(time.time())}.json"
            with open(comparison_path, "w") as f:
                json.dump(comparison_report, f, indent=2)
                
            print(f"\n📄 Comparison report saved to: {comparison_path}")
            
        print("\n" + "="*60 + "\n")


async def main():
    """Main entry point"""
    tester = DiscordBotE2ETester()
    await tester.run()


if __name__ == "__main__":
    # Run the async main function
    asyncio.run(main())