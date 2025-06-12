// Onboarding JavaScript
let currentUser = null;
let currentUserData = null;
let currentStep = 1;
const totalSteps = 6;

// DOM Elements
const progressFill = document.getElementById('progressFill');
const steps = document.querySelectorAll('.step');
const stepContents = document.querySelectorAll('.step-content');
const prevButton = document.getElementById('prev-button');
const nextButton = document.getElementById('next-button');
const skipButton = document.getElementById('skip-button');
const skipAllButton = document.getElementById('skip-all-button');
const finishButton = document.getElementById('finish-button');

// Profile elements
const profilePicPreview = document.getElementById('profilePicPreview');
const profilePicUpload = document.getElementById('profilePicUpload');
const profilePicImage = document.getElementById('profilePicImage');
const displayNameInput = document.getElementById('displayName');
const bioInput = document.getElementById('bio');
const bioCharCount = document.getElementById('bio-char-count');
const usernameDisplay = document.getElementById('username-display');

// Links elements
const addLinkButton = document.getElementById('add-link-button');
const linksContainer = document.getElementById('links-container');
const linkModal = document.getElementById('link-modal');
const linkForm = document.getElementById('link-form');
const closeLinkModal = document.querySelector('.close-modal');

// Social elements
const socialLinksForm = document.getElementById('social-links-form');

// Media elements
const mediaToggleBtn = document.getElementById('media-toggle-btn');
const catalogToggleBtn = document.getElementById('catalog-toggle-btn');
const mediaContentSection = document.getElementById('media-content-section');
const catalogContentSection = document.getElementById('catalog-content-section');
const mediaTypeButtons = document.querySelectorAll('.media-type-btn');

// Template elements
const templatesContainer = document.getElementById('templates-container');

// User data storage
let userLinks = [];
let userSocialLinks = {};
let userMedia = {};
let selectedTemplate = 'neoncard'; // default template

// Initialize onboarding
document.addEventListener('DOMContentLoaded', () => {
    initializeOnboarding();
});

// Check authentication and initialize
function initializeOnboarding() {
    if (!auth) {
        console.error('Firebase Auth not initialized');
        window.location.href = 'login.html';
        return;
    }

    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            loadUserData();
        } else {
            console.log('User not authenticated, redirecting to login');
            window.location.href = 'login.html';
        }
    });
}

// Load user data
async function loadUserData() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            currentUserData = userDoc.data();
            
            // Check if user has already completed onboarding
            if (currentUserData.onboardingCompleted) {
                window.location.href = 'dashboard.html';
                return;
            }
            
            // Populate form with existing data
            if (usernameDisplay) {
                usernameDisplay.textContent = currentUserData.username || 'username';
            }

            // Update welcome message
            const welcomeMessage = document.getElementById('welcome-message');
            if (welcomeMessage) {
                welcomeMessage.textContent = `Welcome to BINK, ${currentUserData.username}!`;
            }
            
            if (currentUserData.displayName && displayNameInput) {
                displayNameInput.value = currentUserData.displayName;
            }
            
            if (currentUserData.bio && bioInput) {
                bioInput.value = currentUserData.bio;
                updateCharCount();
            }
            
            if (currentUserData.profilePicUrl && profilePicImage) {
                profilePicImage.src = currentUserData.profilePicUrl;
            }
        }
        
        setupEventListeners();
        generateSocialLinksForm();
        loadTemplates();
        
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Navigation buttons
    prevButton.addEventListener('click', goToPreviousStep);
    nextButton.addEventListener('click', goToNextStep);
    skipButton.addEventListener('click', skipCurrentStep);
    skipAllButton.addEventListener('click', skipAllSteps);
    finishButton.addEventListener('click', completeOnboarding);
    
    // Profile picture upload
    profilePicPreview.addEventListener('click', () => profilePicUpload.click());
    profilePicUpload.addEventListener('change', handleProfilePicUpload);
    
    // Bio character counter
    bioInput.addEventListener('input', updateCharCount);
    
    // Links
    addLinkButton.addEventListener('click', openLinkModal);
    closeLinkModal.addEventListener('click', closeLinkModalHandler);
    linkForm.addEventListener('submit', saveLinkHandler);
    
    // Media/Catalog toggle
    mediaToggleBtn.addEventListener('click', () => toggleMediaCatalog('media'));
    catalogToggleBtn.addEventListener('click', () => toggleMediaCatalog('catalog'));

    // Media type buttons
    document.querySelectorAll('.media-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mediaType = btn.getAttribute('data-type');
            switchMediaType(mediaType);
        });
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === linkModal) {
            closeLinkModalHandler();
        }
    });
}

// Navigation functions
function goToNextStep() {
    if (currentStep < totalSteps) {
        // Validate current step before proceeding
        if (validateCurrentStep()) {
            saveCurrentStepData();
            currentStep++;
            updateStepDisplay();
        }
    }
}

function goToPreviousStep() {
    if (currentStep > 1) {
        currentStep--;
        updateStepDisplay();
    }
}

function skipCurrentStep() {
    if (currentStep < totalSteps) {
        currentStep++;
        updateStepDisplay();
    } else {
        completeOnboarding();
    }
}

function skipAllSteps() {
    // Show confirmation dialog
    if (confirm('Are you sure you want to skip the entire setup? You can always complete it later from your dashboard.')) {
        completeOnboarding();
    }
}

function updateStepDisplay() {
    // Update progress bar
    const progressPercentage = (currentStep / totalSteps) * 100;
    progressFill.style.width = `${progressPercentage}%`;
    
    // Update step indicators
    steps.forEach((step, index) => {
        const stepNumber = index + 1;
        step.classList.remove('active', 'completed');
        
        if (stepNumber < currentStep) {
            step.classList.add('completed');
        } else if (stepNumber === currentStep) {
            step.classList.add('active');
        }
    });
    
    // Update step content
    stepContents.forEach((content, index) => {
        content.classList.remove('active');
        if (index + 1 === currentStep) {
            content.classList.add('active');
        }
    });
    
    // Update navigation buttons
    prevButton.style.display = currentStep > 1 ? 'flex' : 'none';

    if (currentStep === totalSteps) {
        nextButton.style.display = 'none';
        finishButton.style.display = 'flex';
        skipButton.style.display = 'none'; // Hide skip on preview step
        finishButton.textContent = 'Go to Dashboard';
    } else if (currentStep === totalSteps - 1) {
        nextButton.textContent = 'Preview & Finish';
        skipButton.textContent = 'Skip & Preview';
    } else {
        nextButton.style.display = 'flex';
        finishButton.style.display = 'none';
        skipButton.style.display = 'flex';
        nextButton.textContent = 'Next';
        skipButton.textContent = 'Skip';
    }

    // Load preview if on preview step
    if (currentStep === totalSteps) {
        loadPreview();
    }
}

// Validation functions
function validateCurrentStep() {
    switch (currentStep) {
        case 1: // Profile
            if (!displayNameInput.value.trim()) {
                alert('Please enter your display name to continue.');
                displayNameInput.focus();
                return false;
            }
            return true;
        case 2: // Links - optional
        case 3: // Social - optional
        case 4: // Media - optional
        case 5: // Template - optional
        case 6: // Preview - no validation needed
            return true;
        default:
            return true;
    }
}

// Save current step data
async function saveCurrentStepData() {
    try {
        switch (currentStep) {
            case 1: // Profile
                await saveProfileData();
                break;
            case 2: // Links
                // Links are saved individually when added
                break;
            case 3: // Social
                await saveSocialData();
                break;
            case 4: // Media
                // Media is saved individually when added
                break;
            case 5: // Template
                await saveTemplateSelection();
                break;
            case 6: // Preview
                // No data to save on preview step
                break;
        }
    } catch (error) {
        console.error('Error saving step data:', error);
    }
}

// Profile functions
async function saveProfileData() {
    const profileData = {
        displayName: displayNameInput.value.trim(),
        bio: bioInput.value.trim(),
    };
    
    if (document.getElementById('profilePicUrl').value) {
        profileData.profilePicUrl = document.getElementById('profilePicUrl').value;
    }
    
    await db.collection('users').doc(currentUser.uid).update(profileData);
}

function handleProfilePicUpload(event) {
    const file = event.target.files[0];
    if (file) {
        // Create a preview
        const reader = new FileReader();
        reader.onload = (e) => {
            profilePicImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
        
        // Upload to Firebase Storage
        uploadProfilePicture(file);
    }
}

async function uploadProfilePicture(file) {
    try {
        const storageRef = firebase.storage().ref();
        const profilePicRef = storageRef.child(`profile-pics/${currentUser.uid}/${Date.now()}_${file.name}`);
        
        const snapshot = await profilePicRef.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();
        
        document.getElementById('profilePicUrl').value = downloadURL;
        
        // Update user profile immediately
        await db.collection('users').doc(currentUser.uid).update({
            profilePicUrl: downloadURL
        });
        
    } catch (error) {
        console.error('Error uploading profile picture:', error);
        alert('Error uploading profile picture. Please try again.');
    }
}

function updateCharCount() {
    const count = bioInput.value.length;
    bioCharCount.textContent = count;
    
    if (count > 500) {
        bioCharCount.style.color = '#ef4444';
        bioInput.value = bioInput.value.substring(0, 500);
        bioCharCount.textContent = '500';
    } else {
        bioCharCount.style.color = '#6b7280';
    }
}

// Links functions
function openLinkModal() {
    linkModal.style.display = 'block';
    document.getElementById('link-title').focus();
}

function closeLinkModalHandler() {
    linkModal.style.display = 'none';
    linkForm.reset();
}

async function saveLinkHandler(event) {
    event.preventDefault();
    
    const title = document.getElementById('link-title').value.trim();
    const url = document.getElementById('link-url').value.trim();
    const description = document.getElementById('link-description').value.trim();
    const platform = document.getElementById('link-platform').value;
    
    if (!title || !url) {
        alert('Please fill in the required fields.');
        return;
    }
    
    try {
        // Add http:// if missing
        let formattedUrl = url;
        if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
            formattedUrl = 'https://' + formattedUrl;
        }
        
        const newLink = {
            userId: currentUser.uid,
            title,
            url: formattedUrl,
            description,
            platform,
            clicks: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const docRef = await db.collection('links').add(newLink);
        newLink.id = docRef.id;
        userLinks.push(newLink);
        
        renderLinks();
        closeLinkModalHandler();
        
    } catch (error) {
        console.error('Error saving link:', error);
        alert('Error saving link. Please try again.');
    }
}

function renderLinks() {
    if (userLinks.length === 0) {
        linksContainer.innerHTML = `
            <div class="links-placeholder">
                <i class="fas fa-link"></i>
                <h4>No links yet</h4>
                <p>Add your first link to get started</p>
            </div>
        `;
        return;
    }
    
    linksContainer.innerHTML = userLinks.map(link => `
        <div class="link-item">
            <div class="link-info">
                <h4>${link.title}</h4>
                <p>${link.url}</p>
                ${link.description ? `<span>${link.description}</span>` : ''}
            </div>
            <div class="link-platform">
                <i class="fas fa-${getPlatformIcon(link.platform)}"></i>
            </div>
        </div>
    `).join('');
}

function getPlatformIcon(platform) {
    const icons = {
        website: 'globe',
        youtube: 'play',
        instagram: 'camera',
        twitter: 'twitter',
        linkedin: 'linkedin',
        github: 'code',
        other: 'link'
    };
    return icons[platform] || 'link';
}

// Social functions
function generateSocialLinksForm() {
    const socialPlatforms = [
        { name: 'Instagram', key: 'instagram', icon: 'fab fa-instagram', placeholder: 'https://instagram.com/username' },
        { name: 'Twitter', key: 'twitter', icon: 'fab fa-twitter', placeholder: 'https://twitter.com/username' },
        { name: 'YouTube', key: 'youtube', icon: 'fab fa-youtube', placeholder: 'https://youtube.com/channel/...' },
        { name: 'TikTok', key: 'tiktok', icon: 'fab fa-tiktok', placeholder: 'https://tiktok.com/@username' },
        { name: 'LinkedIn', key: 'linkedin', icon: 'fab fa-linkedin', placeholder: 'https://linkedin.com/in/username' },
        { name: 'Facebook', key: 'facebook', icon: 'fab fa-facebook', placeholder: 'https://facebook.com/username' }
    ];
    
    socialLinksForm.innerHTML = socialPlatforms.map(platform => `
        <div class="social-input-group">
            <label for="social-${platform.key}">
                <i class="${platform.icon}"></i>
                ${platform.name}
            </label>
            <input 
                type="url" 
                id="social-${platform.key}" 
                name="${platform.key}" 
                placeholder="${platform.placeholder}"
                value="${userSocialLinks[platform.key] || ''}"
            >
        </div>
    `).join('');
}

async function saveSocialData() {
    const socialData = {};
    const socialInputs = socialLinksForm.querySelectorAll('input');
    
    socialInputs.forEach(input => {
        if (input.value.trim()) {
            socialData[input.name] = input.value.trim();
        }
    });
    
    if (Object.keys(socialData).length > 0) {
        await db.collection('socialLinks').doc(currentUser.uid).set(socialData, { merge: true });
        userSocialLinks = socialData;
    }
}

// Media functions
function toggleMediaCatalog(section) {
    if (section === 'media') {
        mediaToggleBtn.classList.add('active');
        catalogToggleBtn.classList.remove('active');
        mediaContentSection.style.display = 'block';
        catalogContentSection.style.display = 'none';
    } else {
        catalogToggleBtn.classList.add('active');
        mediaToggleBtn.classList.remove('active');
        catalogContentSection.style.display = 'block';
        mediaContentSection.style.display = 'none';
    }
}

function switchMediaType(mediaType) {
    // Update buttons
    document.querySelectorAll('.media-type-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-type') === mediaType) {
            btn.classList.add('active');
        }
    });

    // Show appropriate content based on media type
    const mediaPlaceholder = document.querySelector('.media-placeholder');
    if (mediaPlaceholder) {
        let icon, title, description;

        switch(mediaType) {
            case 'youtube':
                icon = 'fas fa-play-circle';
                title = 'No YouTube videos yet';
                description = 'Add YouTube videos to showcase your content';
                break;
            case 'images':
                icon = 'fas fa-images';
                title = 'No pictures yet';
                description = 'Upload pictures to create a gallery';
                break;
            case 'music':
                icon = 'fas fa-music';
                title = 'No music links yet';
                description = 'Add music from Spotify, Apple Music, or other platforms';
                break;
        }

        mediaPlaceholder.innerHTML = `
            <i class="${icon}"></i>
            <h4>${title}</h4>
            <p>${description}</p>
            <button class="action-btn primary-btn" onclick="addMediaContent('${mediaType}')">
                <i class="fas fa-plus"></i> Add ${mediaType === 'youtube' ? 'Video' : mediaType === 'images' ? 'Picture' : 'Music'}
            </button>
        `;
    }
}

// Add media content function
function addMediaContent(type) {
    // For now, show a simple prompt - in a full implementation, this would open appropriate modals
    let content;

    switch(type) {
        case 'youtube':
            content = prompt('Enter YouTube video URL:');
            if (content && content.includes('youtube.com')) {
                alert('YouTube video would be added here. (Demo mode)');
            }
            break;
        case 'images':
            // Trigger file input
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.onchange = () => {
                if (fileInput.files[0]) {
                    alert('Image would be uploaded here. (Demo mode)');
                }
            };
            fileInput.click();
            break;
        case 'music':
            content = prompt('Enter music platform URL (Spotify, Apple Music, etc.):');
            if (content && (content.includes('spotify.com') || content.includes('music.apple.com') || content.includes('soundcloud.com'))) {
                alert('Music link would be added here. (Demo mode)');
            }
            break;
    }
}

// Template functions
function loadTemplates() {
    const templates = [
        { id: 'neoncard', name: 'Neon Card', preview: 'templates/neoncard-preview.html', isPremium: false },
        { id: 'glassmorphism', name: 'Glassmorphism', preview: 'templates/glassmorphism-preview.html', isPremium: false },
        { id: 'classic', name: 'Classic', preview: 'templates/classic-preview.html', isPremium: false },
        { id: 'aurora-glow', name: 'Aurora Glow', preview: 'templates/aurora-glow-preview.html', isPremium: true },
        { id: 'cover-story', name: 'Cover Story', preview: 'templates/cover-story-preview.html', isPremium: true },
        { id: 'soft-pastel', name: 'Soft Pastel', preview: 'templates/soft-pastel-preview.html', isPremium: true }
    ];

    templatesContainer.innerHTML = templates.map(template => `
        <div class="template-card ${template.id === selectedTemplate ? 'selected' : ''}" data-template="${template.id}">
            ${template.isPremium ? '<div class="premium-label">Premium</div>' : ''}
            <iframe src="${template.preview}" class="template-preview"></iframe>
            <div class="template-info">
                <div class="template-title">${template.name}</div>
                <button class="template-select-btn ${template.id === selectedTemplate ? 'selected' : ''}" data-template="${template.id}">
                    ${template.id === selectedTemplate ? 'Selected' : 'Select'}
                </button>
            </div>
        </div>
    `).join('');

    // Add click handlers for template selection
    const templateCards = templatesContainer.querySelectorAll('.template-card');
    const selectButtons = templatesContainer.querySelectorAll('.template-select-btn');

    templateCards.forEach(card => {
        card.addEventListener('click', () => {
            const templateId = card.getAttribute('data-template');
            selectTemplate(templateId);
        });
    });

    selectButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const templateId = button.getAttribute('data-template');
            selectTemplate(templateId);
        });
    });
}

function selectTemplate(templateId) {
    selectedTemplate = templateId;

    // Update UI
    const templateCards = templatesContainer.querySelectorAll('.template-card');
    const selectButtons = templatesContainer.querySelectorAll('.template-select-btn');

    templateCards.forEach(card => {
        card.classList.remove('selected');
        if (card.getAttribute('data-template') === templateId) {
            card.classList.add('selected');
        }
    });

    selectButtons.forEach(button => {
        button.classList.remove('selected');
        button.textContent = 'Select';
        if (button.getAttribute('data-template') === templateId) {
            button.classList.add('selected');
            button.textContent = 'Selected';
        }
    });
}

async function saveTemplateSelection() {
    // Save selected template to user profile
    await db.collection('users').doc(currentUser.uid).update({
        selectedTemplate: selectedTemplate
    });
}

// Preview functionality
async function loadPreview() {
    try {
        // Update stats
        updatePreviewStats();

        // Load bio page preview
        const bioPreviewFrame = document.getElementById('bio-preview-frame');
        if (bioPreviewFrame && currentUserData) {
            const bioUrl = `bio.html?user=${currentUserData.username}`;
            bioPreviewFrame.src = bioUrl;
        }

        // Setup preview action buttons
        setupPreviewActions();

    } catch (error) {
        console.error('Error loading preview:', error);
    }
}

function updatePreviewStats() {
    // Count links
    const linksCount = document.getElementById('links-count');
    if (linksCount) {
        linksCount.textContent = userLinks.length;
    }

    // Count social accounts
    const socialCount = document.getElementById('social-count');
    if (socialCount) {
        const socialLinksCount = Object.keys(userSocialLinks).filter(key => userSocialLinks[key]).length;
        socialCount.textContent = socialLinksCount;
    }

    // Count media items (placeholder for now)
    const mediaCount = document.getElementById('media-count');
    if (mediaCount) {
        mediaCount.textContent = '0'; // Will be updated when media functionality is fully implemented
    }
}

function setupPreviewActions() {
    const copyBioLink = document.getElementById('copy-bio-link');
    const shareBioLink = document.getElementById('share-bio-link');

    if (copyBioLink) {
        copyBioLink.addEventListener('click', () => {
            const bioUrl = `${window.location.origin}/bio.html?user=${currentUserData.username}`;
            navigator.clipboard.writeText(bioUrl).then(() => {
                copyBioLink.innerHTML = '<i class="fas fa-check"></i> Copied!';
                setTimeout(() => {
                    copyBioLink.innerHTML = '<i class="fas fa-copy"></i> Copy Bio Link';
                }, 2000);
            }).catch(() => {
                alert('Failed to copy link to clipboard');
            });
        });
    }

    if (shareBioLink) {
        shareBioLink.addEventListener('click', () => {
            const bioUrl = `${window.location.origin}/bio.html?user=${currentUserData.username}`;
            if (navigator.share) {
                navigator.share({
                    title: `${currentUserData.displayName || currentUserData.username}'s Bio`,
                    text: 'Check out my bio page!',
                    url: bioUrl
                });
            } else {
                // Fallback to copying
                navigator.clipboard.writeText(bioUrl).then(() => {
                    alert('Bio link copied to clipboard!');
                }).catch(() => {
                    alert('Bio link: ' + bioUrl);
                });
            }
        });
    }
}

// Complete onboarding
async function completeOnboarding() {
    try {
        // Save any remaining data
        await saveCurrentStepData();

        // Mark onboarding as completed
        await db.collection('users').doc(currentUser.uid).update({
            onboardingCompleted: true,
            onboardingCompletedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Redirect to dashboard
        window.location.href = 'dashboard.html';

    } catch (error) {
        console.error('Error completing onboarding:', error);
        alert('Error completing setup. Please try again.');
    }
}

// Initialize the first step
updateStepDisplay();
