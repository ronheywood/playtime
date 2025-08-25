// Manual Test Script for Annotation Functionality
// Paste this into the browser console after loading a PDF

console.log('🎯 Testing Highlight Annotation System');

// Test 1: Create a mock highlight and show action button
function testActionButton() {
    console.log('\n1️⃣ Testing Action Button Display...');
    
    const canvas = document.getElementById('pdf-canvas');
    if (!canvas) {
        console.error('❌ PDF canvas not found');
        return;
    }
    
    const container = canvas.parentElement;
    
    // Create mock highlight
    const highlight = document.createElement('div');
    highlight.id = 'test-highlight-demo';
    highlight.setAttribute('data-hl-id', 'demo-highlight-001');
    highlight.setAttribute('data-hl-color', 'green');
    highlight.setAttribute('data-hl-confidence', '3');
    highlight.setAttribute('data-page', '1');
    highlight.setAttribute('data-hl-x-pct', '25');
    highlight.setAttribute('data-hl-y-pct', '40');
    highlight.setAttribute('data-hl-w-pct', '50');
    highlight.setAttribute('data-hl-h-pct', '6');
    
    highlight.style.cssText = `
        position: absolute;
        left: 25%;
        top: 40%;
        width: 50%;
        height: 6%;
        background: rgba(0, 255, 0, 0.2);
        border: 2px solid #22c55e;
        border-radius: 4px;
        z-index: 50;
        cursor: pointer;
    `;
    
    container.appendChild(highlight);
    
    // Show action button
    if (window.PlayTimeHighlighting && window.PlayTimeHighlighting._components.actionButton) {
        window.PlayTimeHighlighting._components.actionButton.showForHighlight(highlight);
        console.log('✅ Action button should now be visible');
        console.log('👆 Click the notebook icon to test annotation form');
    } else {
        console.error('❌ PlayTimeHighlighting not available');
    }
}

// Test 2: Programmatically show annotation form
function testAnnotationForm() {
    console.log('\n2️⃣ Testing Annotation Form...');
    
    if (window.PlayTimeHighlighting && window.PlayTimeHighlighting._components.annotationForm) {
        const mockData = {
            highlightId: 'demo-highlight-002',
            color: 'amber',
            page: 2,
            confidence: 2,
            coordinates: { xPct: 30, yPct: 50, wPct: 40, hPct: 5 }
        };
        
        window.PlayTimeHighlighting._components.annotationForm.showForHighlight(mockData);
        console.log('✅ Annotation form should now be visible');
        console.log('📝 Try filling in the title and notes, then save or cancel');
    } else {
        console.error('❌ Annotation form not available');
    }
}

// Test 3: Listen for annotation events
function testEventListening() {
    console.log('\n3️⃣ Setting up event listeners...');
    
    document.addEventListener('playtime:highlight-annotation-saved', (event) => {
        console.log('🎉 Annotation saved event received:', event.detail);
        console.log('📊 Title:', event.detail.annotation?.title);
        console.log('📋 Notes:', event.detail.annotation?.notes);
    });
    
    document.addEventListener('playtime:highlight-annotation-cancelled', (event) => {
        console.log('❌ Annotation cancelled event received:', event.detail);
    });
    
    console.log('✅ Event listeners registered');
}

// Test 4: Check existing highlights for annotations
function checkExistingAnnotations() {
    console.log('\n4️⃣ Checking for existing annotations...');
    
    const highlights = document.querySelectorAll('[data-hl-id]');
    console.log(`📍 Found ${highlights.length} highlights`);
    
    highlights.forEach((highlight, index) => {
        const id = highlight.getAttribute('data-hl-id');
        const title = highlight.getAttribute('data-hl-title');
        const notes = highlight.getAttribute('data-hl-notes');
        const isAnnotated = highlight.getAttribute('data-hl-annotated') === 'true';
        
        if (isAnnotated) {
            console.log(`📝 Highlight ${index + 1} (${id}) has annotation:`);
            console.log(`   Title: "${title}"`);
            console.log(`   Notes: "${notes}"`);
        } else {
            console.log(`📄 Highlight ${index + 1} (${id}) - no annotation`);
        }
    });
}

// Test 5: Cleanup demo highlights
function cleanup() {
    console.log('\n🧹 Cleaning up demo highlights...');
    const demoHighlight = document.getElementById('test-highlight-demo');
    if (demoHighlight) {
        demoHighlight.remove();
        console.log('✅ Demo highlight removed');
    }
    
    // Hide action button
    if (window.PlayTimeHighlighting && window.PlayTimeHighlighting._components.actionButton) {
        window.PlayTimeHighlighting._components.actionButton.hide();
    }
    
    // Hide annotation form
    if (window.PlayTimeHighlighting && window.PlayTimeHighlighting._components.annotationForm) {
        window.PlayTimeHighlighting._components.annotationForm.hide();
    }
}

// Main test function
function runAnnotationTests() {
    console.log('🚀 Starting Annotation System Tests\n');
    
    // Check if system is available
    if (!window.PlayTimeHighlighting) {
        console.error('❌ PlayTimeHighlighting not available. Make sure a PDF is loaded.');
        return;
    }
    
    testEventListening();
    checkExistingAnnotations();
    testActionButton();
    
    console.log('\n⏳ Waiting 3 seconds before showing annotation form...');
    setTimeout(() => {
        testAnnotationForm();
    }, 3000);
    
    console.log('\n📖 Manual Test Instructions:');
    console.log('1. Click the action button (notebook icon) next to the green highlight');
    console.log('2. Fill in a title and notes in the form that appears');
    console.log('3. Click "Save Annotation" to test the save functionality');
    console.log('4. Call cleanup() when done testing');
    console.log('\n🔧 Available functions: testActionButton(), testAnnotationForm(), cleanup()');
}

// Make functions available globally for manual testing
window.annotationTest = {
    run: runAnnotationTests,
    showActionButton: testActionButton,
    showForm: testAnnotationForm,
    checkAnnotations: checkExistingAnnotations,
    cleanup: cleanup
};

console.log('📋 Annotation test functions loaded!');
console.log('📞 Call annotationTest.run() to start testing');
console.log('🔧 Individual functions: annotationTest.showActionButton(), annotationTest.showForm(), etc.');
