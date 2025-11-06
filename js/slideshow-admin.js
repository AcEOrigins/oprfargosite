// Slideshow Image Management

let selectedImageId = null;
let uploadedImages = [];
let slideshowSlides = [];

// API_URL is defined in api.js

// Load uploaded images from database
async function loadUploadedImages() {
    try {
        const response = await fetch(`${API_URL}?action=get_images`);
        const data = await response.json();
        uploadedImages = Array.isArray(data) ? data : [];
        return uploadedImages;
    } catch (error) {
        console.error('Error loading images:', error);
        uploadedImages = [];
        return uploadedImages;
    }
}

// Upload image to database
async function uploadImage(imageData) {
    try {
        const response = await fetch(`${API_URL}?action=upload_image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(imageData)
        });
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
}

// Load slideshow configuration from database
async function loadSlideshowConfig() {
    try {
        const response = await fetch(`${API_URL}?action=get_slideshow`);
        const slides = await response.json();
        slideshowSlides = Array.isArray(slides) ? slides : [];
        
        // Convert to old format for compatibility
        const config = {};
        slideshowSlides.forEach(slide => {
            config[`slide${slide.slide_number}`] = slide.image_data || slide.image_id || '';
        });
        return config;
    } catch (error) {
        console.error('Error loading slideshow:', error);
        return {};
    }
}

// Save slideshow slide configuration
async function saveSlideshowSlide(slideNumber, imageId) {
    try {
        const response = await fetch(`${API_URL}?action=set_slide`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                slideNumber: slideNumber,
                imageId: imageId
            })
        });
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error saving slideshow slide:', error);
        throw error;
    }
}

// Add new slide to slideshow
async function addNewSlide() {
    try {
        const response = await fetch(`${API_URL}?action=add_slide`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        
        if (result.success) {
            // Reload slideshow and update modal
            await loadSlideshowConfig();
            await populateSlideshowPositions();
            if (typeof showToast === 'function') {
                showToast('Slide Added', `Slide ${result.slideNumber} has been added`, 'success');
            }
        }
    } catch (error) {
        console.error('Error adding slide:', error);
        alert('Error adding slide. Please try again.');
    }
}

// Populate slideshow positions in modal
async function populateSlideshowPositions() {
    const container = document.getElementById('slideshowPositions');
    if (!container) return;
    
    await loadSlideshowConfig();
    
    container.innerHTML = slideshowSlides.map(slide => {
        const slideNum = slide.slide_number;
        return `
            <label class="position-option">
                <input type="radio" name="slidePosition" value="${slideNum}">
                <span>Slide ${slideNum}</span>
            </label>
        `;
    }).join('');
    
    // Check if current image is in slideshow
    if (selectedImageId) {
        const currentImage = uploadedImages.find(img => img.id == selectedImageId);
        if (currentImage) {
            const slide = slideshowSlides.find(s => s.image_id == selectedImageId || s.image_data === currentImage.data);
            if (slide) {
                const radio = container.querySelector(`input[value="${slide.slide_number}"]`);
                if (radio) radio.checked = true;
            }
        }
    }
}

// Open image upload modal
function openImageUploadModal() {
    const modal = document.getElementById('uploadImageModal');
    modal.style.display = 'flex';
}

// Close image upload modal
function closeImageUploadModal() {
    const modal = document.getElementById('uploadImageModal');
    modal.style.display = 'none';
}

// Trigger file input when drop zone is clicked
function triggerFileInput() {
    document.getElementById('imageUploadInput').click();
}

// Handle file selection
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('imageUploadInput');
    const uploadDropZone = document.getElementById('uploadDropZone');
    const uploadModal = document.getElementById('uploadImageModal');
    
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            handleFileSelect(e);
            closeImageUploadModal();
        });
    }
    
    if (uploadDropZone) {
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadDropZone.addEventListener(eventName, preventDefaults, false);
        });
        
        // Highlight drop zone when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadDropZone.addEventListener(eventName, () => {
                uploadDropZone.classList.add('dragover');
            }, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            uploadDropZone.addEventListener(eventName, () => {
                uploadDropZone.classList.remove('dragover');
            }, false);
        });
        
        // Handle dropped files
        uploadDropZone.addEventListener('drop', (e) => {
            handleDrop(e);
            closeImageUploadModal();
        }, false);
    }
    
    // Close modal when clicking overlay
    if (uploadModal) {
        const overlay = uploadModal.querySelector('.upload-image-modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', closeImageUploadModal);
        }
    }
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && uploadModal && uploadModal.style.display === 'flex') {
            closeImageUploadModal();
        }
    });
    
    // Close context menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.context-menu') && !e.target.closest('.image-item')) {
            closeContextMenu();
        }
    });
    
    // Load images on page load
    if (document.getElementById('slideshow-section')) {
        loadUploadedImages().then(() => {
            displayImages();
        });
    }
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

function handleFileSelect(e) {
    const files = e.target.files;
    handleFiles(files);
}

async function handleFiles(files) {
    for (const file of Array.from(files)) {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const imageData = {
                    name: file.name,
                    data: e.target.result,
                    type: file.type,
                    size: file.size
                };
                
                try {
                    const result = await uploadImage(imageData);
                    if (result.success) {
                        await loadUploadedImages();
                        displayImages();
                        if (typeof showToast === 'function') {
                            showToast('Image Uploaded', `"${file.name}" has been uploaded`, 'success');
                        }
                    }
                } catch (error) {
                    console.error('Error uploading image:', error);
                    alert('Error uploading image. Please try again.');
                }
            };
            reader.readAsDataURL(file);
        }
    }
}

// Display images in grid
async function displayImages() {
    const grid = document.getElementById('imagesGrid');
    if (!grid) return;
    
    await loadUploadedImages();
    await loadSlideshowConfig();
    
    if (uploadedImages.length === 0) {
        grid.innerHTML = '<div class="empty-state">No images uploaded yet. Click "Add Image" to get started.</div>';
        return;
    }
    
    grid.innerHTML = uploadedImages.map(img => {
        // Check if this image is in the slideshow
        const slide = slideshowSlides.find(s => s.image_id == img.id || s.image_data === img.data);
        const slideNumber = slide ? slide.slide_number : null;
        
        return `
            <div class="image-item" data-image-id="${img.id}" oncontextmenu="showContextMenu(event, '${img.id}'); return false;">
                <div class="image-item-overlay">
                    ${slideNumber ? `<span class="slideshow-badge">Slide ${slideNumber}</span>` : ''}
                </div>
                <img src="${img.data}" alt="${escapeHtml(img.name)}">
                <div class="image-item-name">${escapeHtml(img.name)}</div>
            </div>
        `;
    }).join('');
}

// Show context menu
function showContextMenu(e, imageId) {
    e.preventDefault();
    selectedImageId = imageId;
    
    const contextMenu = document.getElementById('contextMenu');
    contextMenu.style.display = 'block';
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.top = `${e.pageY}px`;
}

// Close context menu
function closeContextMenu() {
    const contextMenu = document.getElementById('contextMenu');
    contextMenu.style.display = 'none';
    selectedImageId = null;
}

// Open set image modal
async function openSetImageModal() {
    closeContextMenu();
    const modal = document.getElementById('setImageModal');
    modal.style.display = 'flex';
    
    // Populate slideshow positions
    await populateSlideshowPositions();
}

// Close set image modal
function closeSetImageModal() {
    const modal = document.getElementById('setImageModal');
    modal.style.display = 'none';
    selectedImageId = null;
}

// Confirm set image
async function confirmSetImage() {
    if (!selectedImageId) return;
    
    const position = document.querySelector('input[name="slidePosition"]:checked');
    if (!position) {
        alert('Please select a slideshow position');
        return;
    }
    
    const slideNumber = parseInt(position.value);
    const image = uploadedImages.find(img => img.id == selectedImageId);
    
    if (image) {
        try {
            const result = await saveSlideshowSlide(slideNumber, selectedImageId);
            if (result.success) {
                closeSetImageModal();
                await displayImages();
                if (typeof showToast === 'function') {
                    showToast('Image Set', `Image has been set as Slide ${slideNumber}`, 'success');
                }
            } else {
                alert('Error setting image: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error setting image:', error);
            alert('Error setting image. Please try again.');
        }
    }
}

// Open rename modal
function renameImage() {
    closeContextMenu();
    if (!selectedImageId) return;
    
    const image = uploadedImages.find(img => img.id == selectedImageId);
    if (!image) return;
    
    const modal = document.getElementById('renameImageModal');
    document.getElementById('newImageName').value = image.name;
    modal.style.display = 'flex';
}

// Close rename modal
function closeRenameModal() {
    const modal = document.getElementById('renameImageModal');
    modal.style.display = 'none';
    selectedImageId = null;
}

// Confirm rename
async function confirmRenameImage() {
    if (!selectedImageId) return;
    
    const newName = document.getElementById('newImageName').value.trim();
    if (!newName) {
        alert('Please enter a name for the image');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}?action=update_image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: selectedImageId,
                name: newName
            })
        });
        const result = await response.json();
        
        if (result.success) {
            await loadUploadedImages();
            displayImages();
            closeRenameModal();
            if (typeof showToast === 'function') {
                showToast('Image Renamed', 'Image name updated successfully', 'success');
            }
        } else {
            alert('Error renaming image: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error renaming image:', error);
        alert('Error renaming image. Please try again.');
    }
}

// Delete image
async function deleteImage() {
    closeContextMenu();
    if (!selectedImageId) return;
    
    const image = uploadedImages.find(img => img.id == selectedImageId);
    if (!image) return;
    
    if (confirm(`Are you sure you want to delete "${image.name}"?`)) {
        try {
            const response = await fetch(`${API_URL}?action=delete_image&id=${selectedImageId}`);
            const result = await response.json();
            
            if (result.success) {
                // Reload images from server
                await loadUploadedImages();
                displayImages();
                if (typeof showToast === 'function') {
                    showToast('Image Deleted', `"${image.name}" has been deleted`, 'success');
                }
            } else {
                alert('Error deleting image: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error deleting image:', error);
            alert('Error deleting image. Please try again.');
        }
    }
    
    selectedImageId = null;
}

// Close modals when clicking overlay
document.addEventListener('DOMContentLoaded', () => {
    const setImageModal = document.getElementById('setImageModal');
    const renameModal = document.getElementById('renameImageModal');
    
    if (setImageModal) {
        const overlay = setImageModal.querySelector('.set-image-modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', closeSetImageModal);
        }
    }
    
    if (renameModal) {
        const overlay = renameModal.querySelector('.rename-image-modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', closeRenameModal);
        }
    }
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (setImageModal && setImageModal.style.display === 'flex') {
                closeSetImageModal();
            }
            if (renameModal && renameModal.style.display === 'flex') {
                closeRenameModal();
            }
        }
    });
});

// Escape HTML helper
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
