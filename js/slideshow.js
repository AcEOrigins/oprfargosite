// Slideshow Configuration
const SLIDESHOW_INTERVAL = 5000; // 5 seconds between slides

let currentSlideIndex = 0;
let slideshowInterval;

// Load slideshow images from database
async function loadSlideshowImages() {
    try {
        const response = await fetch('/php/api.php?action=get_slideshow');
        const slides = await response.json();
        
        if (Array.isArray(slides) && slides.length > 0) {
            const config = {};
            slides.forEach(slide => {
                if (slide.image_data) {
                    config[`slide${slide.slide_number}`] = slide.image_data;
                }
            });
            return config;
        }
    } catch (error) {
        console.error('Error loading slideshow:', error);
    }
    
    // Default fallback
    return {
        slide1: 'assets/opr1.jpg',
        slide2: 'images/slide2.jpg',
        slide3: 'images/slide3.jpg'
    };
}

// Initialize slideshow
async function initSlideshow() {
    // Load images from database
    const slideshowConfig = await loadSlideshowImages();
    const slideshowWrapper = document.querySelector('.slideshow-wrapper');
    const slideshowDots = document.querySelector('.slideshow-dots');
    
    if (slideshowWrapper) {
        // Clear existing slides
        slideshowWrapper.innerHTML = '';
        if (slideshowDots) {
            slideshowDots.innerHTML = '';
        }
        
        // Create slides from config
        const slides = [];
        const slideKeys = Object.keys(slideshowConfig).sort((a, b) => {
            const numA = parseInt(a.replace('slide', ''));
            const numB = parseInt(b.replace('slide', ''));
            return numA - numB;
        });
        
        slideKeys.forEach((key, index) => {
            if (slideshowConfig[key]) {
                const slide = document.createElement('div');
                slide.className = 'slide';
                if (index === 0) slide.classList.add('active');
                
                const img = document.createElement('img');
                img.src = slideshowConfig[key];
                img.alt = `Slide ${key.replace('slide', '')}`;
                slide.appendChild(img);
                slideshowWrapper.appendChild(slide);
                slides.push(slide);
                
                // Create dot
                if (slideshowDots) {
                    const dot = document.createElement('span');
                    dot.className = 'dot';
                    if (index === 0) dot.classList.add('active');
                    dot.onclick = () => currentSlide(index + 1);
                    slideshowDots.appendChild(dot);
                }
            }
        });
        
        // If no slides configured, use default
        if (slides.length === 0) {
            const defaultSlide = document.createElement('div');
            defaultSlide.className = 'slide active';
            const img = document.createElement('img');
            img.src = 'assets/opr1.jpg';
            img.alt = 'OPR Fargo Server';
            defaultSlide.appendChild(img);
            slideshowWrapper.appendChild(defaultSlide);
            
            if (slideshowDots) {
                const dot = document.createElement('span');
                dot.className = 'dot active';
                dot.onclick = () => currentSlide(1);
                slideshowDots.appendChild(dot);
            }
        }
    }
    
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    
    if (slides.length === 0) return;
    
    // Start auto-advance
    slideshowInterval = setInterval(nextSlide, SLIDESHOW_INTERVAL);
    
    // Pause on hover
    const slideshowContainer = document.querySelector('.slideshow-container');
    if (slideshowContainer) {
        slideshowContainer.addEventListener('mouseenter', () => {
            clearInterval(slideshowInterval);
        });
        
        slideshowContainer.addEventListener('mouseleave', () => {
            slideshowInterval = setInterval(nextSlide, SLIDESHOW_INTERVAL);
        });
    }
}

// Show specific slide
function showSlide(index) {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    
    if (slides.length === 0) return;
    
    // Wrap around if out of bounds
    if (index >= slides.length) {
        currentSlideIndex = 0;
    } else if (index < 0) {
        currentSlideIndex = slides.length - 1;
    } else {
        currentSlideIndex = index;
    }
    
    // Remove active class from all slides with a slight delay for smooth transition
    slides.forEach((slide, i) => {
        if (i !== currentSlideIndex) {
            slide.classList.remove('active');
        }
    });
    
    // Remove active class from all dots
    dots.forEach(dot => {
        dot.classList.remove('active');
    });
    
    // Show current slide with a small delay for smooth transition
    setTimeout(() => {
        if (slides[currentSlideIndex]) {
            slides[currentSlideIndex].classList.add('active');
        }
        
        // Activate current dot
        if (dots[currentSlideIndex]) {
            dots[currentSlideIndex].classList.add('active');
        }
    }, 50);
    
    // Reset interval
    clearInterval(slideshowInterval);
    slideshowInterval = setInterval(nextSlide, SLIDESHOW_INTERVAL);
}

// Go to next slide
function nextSlide() {
    showSlide(currentSlideIndex + 1);
}

// Go to previous slide
function prevSlide() {
    showSlide(currentSlideIndex - 1);
}

// Go to specific slide (for dot navigation)
function currentSlide(index) {
    showSlide(index - 1); // Convert to 0-based index
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await initSlideshow();
});

