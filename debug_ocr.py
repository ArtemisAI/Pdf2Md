#!/usr/bin/env python3
"""
Debug script to validate OCR dependencies and functionality
"""
import sys
import os

def check_dependencies():
    """Check if all required OCR dependencies are available"""
    dependencies = {
        'PIL': 'Pillow',
        'pytesseract': 'pytesseract', 
        'cv2': 'opencv-python'
    }
    
    results = {}
    for module, package in dependencies.items():
        try:
            __import__(module)
            print(f"✅ {package} is available")
            results[module] = True
        except ImportError:
            print(f"❌ {package} is NOT available")
            results[module] = False
    
    return results

def check_tesseract():
    """Check if Tesseract OCR executable is available"""
    try:
        import pytesseract
        version = pytesseract.get_tesseract_version()
        print(f"✅ Tesseract executable found")
        print(f"✅ Tesseract version: {version}")
        
        langs = pytesseract.get_languages(config='')
        print(f"✅ Available languages: {langs}")
        return True
    except Exception as e:
        print(f"❌ Tesseract check failed: {e}")
        return False

def test_basic_ocr():
    """Test basic OCR functionality with a test image"""
    try:
        from PIL import Image, ImageDraw, ImageFont
        import pytesseract
        import tempfile
        import os
        
        # Create a simple test image with text
        img = Image.new('RGB', (300, 100), color='white')
        draw = ImageDraw.Draw(img)
        
        # Draw some test text
        text = "Hello World OCR Test"
        try:
            # Try to use a default font, fall back to basic if not available
            font = ImageFont.load_default()
        except:
            font = None
            
        draw.text((10, 30), text, fill='black', font=font)
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
            img.save(tmp.name)
            tmp_path = tmp.name
        
        try:
            # Perform OCR
            extracted_text = pytesseract.image_to_string(img)
            extracted_text = extracted_text.strip()
            
            print(f"✅ OCR test successful")
            print(f"   Original text: '{text}'")
            print(f"   Extracted text: '{extracted_text}'")
            print(f"   Match quality: {len(extracted_text) > 0}")
            
            return True
        finally:
            # Clean up temp file
            os.unlink(tmp_path)
            
    except Exception as e:
        print(f"❌ OCR test failed: {e}")
        return False

def main():
    """Main validation function"""
    print("🔍 Starting OCR Environment Validation")
    print("=" * 50)
    
    # Check dependencies
    deps_ok = check_dependencies()
    print()
    
    # Check Tesseract
    tesseract_ok = check_tesseract()
    print()
    
    # Test OCR functionality
    if all(deps_ok.values()) and tesseract_ok:
        ocr_ok = test_basic_ocr()
    else:
        print("⚠️  Skipping OCR test due to missing dependencies")
        ocr_ok = False
    
    print()
    print("📊 Validation Summary:")
    print("-" * 30)
    for module, status in deps_ok.items():
        status_icon = "✅" if status else "❌"
        print(f"{status_icon} {module}")
    
    print(f"{'✅' if tesseract_ok else '❌'} Tesseract OCR")
    print(f"{'✅' if ocr_ok else '❌'} OCR Functionality")
    
    if all(deps_ok.values()) and tesseract_ok and ocr_ok:
        print("\n🎉 All OCR dependencies are ready!")
        return 0
    else:
        print("\n❌ Some dependencies are missing or not working")
        return 1

if __name__ == "__main__":
    sys.exit(main())