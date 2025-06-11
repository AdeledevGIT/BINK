// Ensure Firebase config is loaded
if (typeof firebase === 'undefined' || firebase === null) {
    console.error("Firebase is not initialized. Make sure firebase-config.js is loaded correctly.");
}

// Initialize Firebase Analytics if available
let analytics = null;
if (typeof firebase !== 'undefined' && firebase.analytics) {
    analytics = firebase.analytics();
    console.log("Firebase Analytics initialized");
}

// Get username from URL
const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get('u');
const templateOverride = urlParams.get('t');
const isPreview = urlParams.get('preview') === 'true';



// DOM elements
const bioRoot = document.getElementById('bio-root');

// Social media platform icons mapping
const socialMediaIcons = {
    'instagram': 'fab fa-instagram',
    'twitter': 'fab fa-twitter',
    'facebook': 'fab fa-facebook',
    'youtube': 'fab fa-youtube',
    'tiktok': 'fab fa-tiktok',
    'linkedin': 'fab fa-linkedin',
    'github': 'fab fa-github',
    'pinterest': 'fab fa-pinterest',
    'snapchat': 'fab fa-snapchat',
    'reddit': 'fab fa-reddit',
    'twitch': 'fab fa-twitch',
    'discord': 'fab fa-discord',
    'whatsapp': 'fab fa-whatsapp',
    'telegram': 'fab fa-telegram',
    'medium': 'fab fa-medium',
    'spotify': 'fab fa-spotify',
    'apple-music': 'fab fa-apple',
    'youtube-music': 'fab fa-youtube',
    'audiomack': 'fas fa-music',
    'soundcloud': 'fab fa-soundcloud',
    'bandcamp': 'fab fa-bandcamp',
    'tidal': 'fas fa-music',
    'deezer': 'fas fa-music',
    'amazon-music': 'fab fa-amazon',
    'behance': 'fab fa-behance',
    'dribbble': 'fab fa-dribbble',
    'website': 'fas fa-globe',
    'email': 'fas fa-envelope',
    'phone': 'fas fa-phone',
    'other': 'fas fa-link'
};

// Function to load user profile and links
async function loadUserProfile() {
    if (!username) {
        displayError("No username specified");
        return;
    }

    if (!db) {
        displayError("Database connection not available");
        return;
    }

    try {
        // Find user by username
        const usersRef = db.collection('users');
        const querySnapshot = await usersRef.where('username', '==', username).get();

        if (querySnapshot.empty) {
            displayError("User not found");
            return;
        }

        // Get user data
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        userData.id = userDoc.id; // Add id for later use

        // Update profile information (now dynamic)
        updateProfileInfo(userData);



        // Track page view in Firestore and analytics (only if not in preview mode)
        if (!isPreview) {
            try {
                // Get visitor's location
                const geoData = await getVisitorLocation();
                console.log("Visitor location data:", geoData);

                // Update the bioPage document to increment views
                const bioPageRef = db.collection('bioPages').doc(userDoc.id);
                await bioPageRef.update({
                    views: firebase.firestore.FieldValue.increment(1),
                    lastViewedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                console.log("Page view tracked in Firestore");

                // Record click with location data
                const clickData = {
                    userId: userDoc.id,
                    bioUsername: username,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    referrer: document.referrer || 'direct',
                    userAgent: navigator.userAgent,
                    geo: geoData
                };

                // Add to clicks collection
                await db.collection('clicks').add(clickData);
                console.log("Click with location data recorded");

                // Also track in Firebase Analytics if available
                if (analytics) {
                    analytics.logEvent('bio_page_view', {
                        username: username,
                        userId: userDoc.id,
                        country: geoData.country || 'unknown',
                        city: geoData.city || 'unknown'
                    });
                }
            } catch (error) {
                console.error("Error tracking page view:", error);
                // Create bioPage document if it doesn't exist
                try {
                    const bioPageRef = db.collection('bioPages').doc(userDoc.id);
                    await bioPageRef.set({
                        views: 1,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        lastViewedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                    console.log("Created bioPage document and tracked view");

                    // Still try to record click without location data
                    const clickData = {
                        userId: userDoc.id,
                        bioUsername: username,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                        referrer: document.referrer || 'direct',
                        userAgent: navigator.userAgent
                    };

                    await db.collection('clicks').add(clickData);
                    console.log("Click recorded without location data");
                } catch (setError) {
                    console.error("Error creating bioPage document:", setError);
                }
            }
        } else {
            console.log("Preview mode detected - skipping view tracking");
        }
    } catch (error) {
        console.error("Error loading profile:", error);
        displayError("Error loading profile");
    }
}

// Function to update profile information
function updateProfileInfo(userData) {
    // Use override if present, but make it optional
    // If templateOverride is provided, use it (for preview purposes)
    // Otherwise, use the user's stored template from their profile
    let templateToUse = templateOverride || userData.template;
    if (templateToUse && window.BINK && window.BINK.templates) {
        userData.template = templateToUse;
        renderTemplate(userData);
    } else {
        renderClassicTemplate(userData);
    }
}

// Function to render the selected template
function renderTemplate(userData) {
    const templateId = userData.template;
    const templateObj = window.BINK.templates.templates[templateId];
    if (!templateObj) {
        renderClassicTemplate(userData);
        return;
    }

    // Check if template is premium and if user has access
    // Only check if not in preview mode (templateOverride)
    if (templateObj.isPremium && !templateOverride) {
        // Check if user has valid premium access
        const isPremiumUser = checkPremiumStatus(userData);
        const userHasPurchasedTemplate = Array.isArray(userData.usedTemplates) && userData.usedTemplates.includes(templateId);

        if (!isPremiumUser && !userHasPurchasedTemplate) {
            console.log(`User doesn't have access to premium template ${templateId}. Using classic template instead.`);

            // Update user's template to classic in database to prevent future access
            if (userData.id) {
                updateUserTemplateToClassic(userData.id, templateId);
            }

            renderClassicTemplate(userData);
            return;
        }
    }

    // Load template CSS if not already loaded
    if (!document.getElementById('template-css-' + templateId)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = templateObj.css;
        link.id = 'template-css-' + templateId;
        document.head.appendChild(link);
    }

    // Gather links and socialLinks
    // We'll load links after userData is set, so pass empty for now
    bioRoot.innerHTML = templateObj.render({
        displayName: userData.displayName || userData.username,
        username: userData.username,
        bio: userData.bio,
        profilePicUrl: userData.profilePicUrl,
        links: [], // will be filled after loadUserLinks
        socialLinks: userData.socialLinks || {},
        media: {} // will be filled after loadUserMedia
    });

    // After links are loaded, update the template
    loadUserLinks(userData.id, templateObj, userData);
    loadUserMedia(userData.id, templateObj, userData);
}

// Function to render the classic template (fallback)
function renderClassicTemplate(userData) {
    bioRoot.innerHTML = `
        <div class="bio-page">
            <div class="bio-container">
                <div class="bio-header">
                    <div class="profile-image-container">
                        <img id="profile-image" src="${userData.profilePicUrl || 'https://adeledevgit.github.io/bink/profile.png'}" alt="Profile Image">
                    </div>
                    <div class="bio-header-content">
                        <h1 id="display-name">${userData.displayName || userData.username}</h1>
                        <p id="bio-text" class="bio-description">${userData.bio || ''}</p>
                    </div>
                </div>
                <div class="links-container" id="links-container"></div>
                <div class="media-container" id="media-container"></div>
                <div class="social-icons" id="social-icons"></div>
                <footer class="bio-footer">
                    <p>Powered by <a href="index.html" target="_blank">BINK</a></p>
                </footer>
            </div>
        </div>
    `;
    // After links are loaded, update the classic template
    loadUserLinks(userData.id, null, userData);
    loadUserMedia(userData.id, null, userData);
}

// Function to load user links
async function loadUserLinks(userId, templateObj = null, userData = null) {
    try {
        const linksRef = db.collection('users').doc(userId).collection('links');
        const querySnapshot = await linksRef.orderBy('order').get();

        const links = [];
        querySnapshot.forEach((doc) => {
            links.push({ ...doc.data(), id: doc.id });
        });

        if (templateObj && userData) {
            // Re-render the template with links and media
            bioRoot.innerHTML = templateObj.render({
                displayName: userData.displayName || userData.username,
                username: userData.username,
                bio: userData.bio,
                profilePicUrl: userData.profilePicUrl,
                links: links,
                socialLinks: userData.socialLinks || {},
                media: userData.media || {}
            });
        } else {
            // Classic fallback
            const linksContainer = document.getElementById('links-container');
            if (links.length === 0) {
                linksContainer.innerHTML = '<div class="link-placeholder">No links available</div>';
            } else {
                linksContainer.innerHTML = '';
                links.forEach(linkData => {
                    const linkElement = document.createElement('a');
                    linkElement.href = "javascript:void(0);"; // Use JavaScript handler instead of direct link
                    linkElement.className = 'bio-link';
                    linkElement.rel = 'noopener noreferrer';
                    const platform = linkData.platform?.toLowerCase() || 'other';
                    const iconClass = socialMediaIcons[platform] || socialMediaIcons.other;
                    linkElement.innerHTML = `<i class="${iconClass}"></i><span>${linkData.title}</span>`;
                    // Add click event to track clicks with location data
                    linkElement.addEventListener('click', function(e) {
                        e.preventDefault();
                        trackLinkClick(linkData.id, linkData.url, userId);
                    });
                    linksContainer.appendChild(linkElement);
                });
            }
            // Social icons
            if (userData && userData.socialLinks) {
                const socialIcons = document.getElementById('social-icons');
                socialIcons.innerHTML = '';
                for (const [platform, url] of Object.entries(userData.socialLinks)) {
                    if (!url) continue;
                    const iconClass = socialMediaIcons[platform.toLowerCase()] || socialMediaIcons.other;
                    const iconElement = document.createElement('a');
                    iconElement.href = "javascript:void(0);"; // Use JavaScript handler instead of direct link
                    iconElement.className = 'social-icon';
                    iconElement.rel = 'noopener noreferrer';
                    iconElement.innerHTML = `<i class="${iconClass}"></i>`;
                    // Add click event to track clicks with location data
                    iconElement.addEventListener('click', function(e) {
                        e.preventDefault();
                        // Create a virtual link ID for social links
                        const virtualLinkId = `social_${platform}_${userId}`;
                        trackLinkClick(virtualLinkId, url, userId);
                    });
                    socialIcons.appendChild(iconElement);
                }
            }
        }
    } catch (error) {
        if (templateObj && userData) {
            bioRoot.innerHTML += `<div class="link-placeholder">Error loading links</div>`;
        } else {
            const linksContainer = document.getElementById('links-container');
            linksContainer.innerHTML = '<div class="link-placeholder">Error loading links</div>';
        }
    }
}

// Function to load user media
async function loadUserMedia(userId, templateObj = null, userData = null) {
    try {
        const mediaRef = db.collection('users').doc(userId).collection('media');
        const querySnapshot = await mediaRef.get();

        const media = {
            youtube: [],
            images: [],
            music: []
        };

        querySnapshot.forEach((doc) => {
            const mediaData = { ...doc.data(), id: doc.id };
            const type = mediaData.type;
            if (media[type]) {
                media[type].push(mediaData);
            }
        });

        if (templateObj && userData) {
            // For templates, add media to userData and re-render
            userData.media = media;

            // Get current links to include in re-render
            const linksRef = db.collection('users').doc(userId).collection('links');
            const linksSnapshot = await linksRef.orderBy('order').get();
            const links = [];
            linksSnapshot.forEach((doc) => {
                links.push({ ...doc.data(), id: doc.id });
            });

            // Re-render template with media data
            bioRoot.innerHTML = templateObj.render({
                displayName: userData.displayName || userData.username,
                username: userData.username,
                bio: userData.bio,
                profilePicUrl: userData.profilePicUrl,
                links: links,
                socialLinks: userData.socialLinks || {},
                media: media
            });
        } else {
            // Classic template - render media in media container
            const mediaContainer = document.getElementById('media-container');
            if (mediaContainer) {
                renderMediaContent(media, mediaContainer);
            }
        }
    } catch (error) {
        console.error("Error loading media:", error);
        const mediaContainer = document.getElementById('media-container');
        if (mediaContainer) {
            mediaContainer.innerHTML = '<div class="media-error">Error loading media content</div>';
        }
    }
}

function renderMediaContent(media, container) {
    // Check if media is empty and provide sample data for preview
    const hasAnyMedia = (media.youtube && media.youtube.length > 0) ||
                       (media.images && media.images.length > 0) ||
                       (media.music && media.music.length > 0);

    if (!hasAnyMedia) {
        // Provide sample media data for preview
        media = {
            youtube: [{
                id: 'sample-1',
                title: 'Sample Video',
                url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                description: 'This is a sample video to showcase the media feature'
            }],
            images: [{
                id: 'sample-2',
                title: 'Sample Image',
                url: 'https://via.placeholder.com/400x300/6366f1/ffffff?text=Sample+Image',
                description: 'This is a sample image to showcase the gallery feature'
            }],
            music: [
                {
                    id: 'sample-3',
                    title: 'Sample Song',
                    artist: 'Sample Artist',
                    platform: 'spotify',
                    url: '#'
                },
                {
                    id: 'sample-4',
                    title: 'Another Track',
                    artist: 'Demo Artist',
                    platform: 'apple-music',
                    url: '#'
                },
                {
                    id: 'sample-5',
                    title: 'AudioMack Demo',
                    artist: 'AudioMack Artist',
                    platform: 'audiomack',
                    url: '#'
                }
            ]
        };
    }

    let mediaHTML = '';

    // YouTube Videos
    if (media.youtube && media.youtube.length > 0) {
        mediaHTML += `
            <div class="media-section">
                <h3 class="media-section-title">
                    <i class="fab fa-youtube"></i> Videos
                </h3>
                <div class="media-grid youtube-grid">
                    ${media.youtube.map(video => `
                        <div class="media-item youtube-item">
                            <div class="youtube-embed-container">
                                <iframe
                                    src="https://www.youtube.com/embed/${getYouTubeVideoId(video.url)}"
                                    frameborder="0"
                                    allowfullscreen
                                    loading="lazy">
                                </iframe>
                            </div>
                            <div class="media-info">
                                <h4 class="media-title">${video.title}</h4>
                                ${video.description ? `<p class="media-description">${video.description}</p>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Images
    if (media.images && media.images.length > 0) {
        mediaHTML += `
            <div class="media-section">
                <h3 class="media-section-title">
                    <i class="fas fa-images"></i> Gallery
                </h3>
                <div class="media-grid images-grid">
                    ${media.images.map(image => `
                        <div class="media-item image-item">
                            <div class="image-container">
                                <img src="${image.url}" alt="${image.title}" loading="lazy" onclick="openImageModal('${image.url}', '${image.title}')">
                            </div>
                            <div class="media-info">
                                <h4 class="media-title">${image.title}</h4>
                                ${image.description ? `<p class="media-description">${image.description}</p>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Music
    if (media.music && media.music.length > 0) {
        mediaHTML += `
            <div class="media-section">
                <h3 class="media-section-title">
                    <i class="fas fa-music"></i> Music
                </h3>
                <div class="media-grid music-grid">
                    ${media.music.map(music => `
                        <div class="media-item music-item">
                            <div class="music-player" onclick="playMusicPreview('${music.platform}', '${music.url}', '${music.title}')">
                                <div class="music-platform-icon ${music.platform}">
                                    <i class="${getMusicPlatformIcon(music.platform)}"></i>
                                </div>
                                <div class="music-info">
                                    <h4 class="music-title">${music.title}</h4>
                                    ${music.artist ? `<p class="music-artist">by ${music.artist}</p>` : ''}
                                    <p class="music-platform">${getPlatformDisplayName(music.platform)}</p>
                                </div>
                                <div class="play-button">
                                    <i class="fas fa-play"></i>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    container.innerHTML = mediaHTML;
}

// Helper functions
function getYouTubeVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function getMusicPlatformIcon(platform) {
    const icons = {
        'spotify': 'fab fa-spotify',
        'apple-music': 'fab fa-apple',
        'youtube-music': 'fab fa-youtube',
        'audiomack': 'fas fa-music',
        'soundcloud': 'fab fa-soundcloud',
        'bandcamp': 'fab fa-bandcamp',
        'tidal': 'fas fa-music',
        'deezer': 'fas fa-music',
        'amazon-music': 'fab fa-amazon',
        'other': 'fas fa-music'
    };
    return icons[platform] || icons.other;
}

function getPlatformDisplayName(platform) {
    const names = {
        'spotify': 'Spotify',
        'apple-music': 'Apple Music',
        'youtube-music': 'YouTube Music',
        'audiomack': 'AudioMack',
        'soundcloud': 'SoundCloud',
        'bandcamp': 'Bandcamp',
        'tidal': 'Tidal',
        'deezer': 'Deezer',
        'amazon-music': 'Amazon Music',
        'other': 'Music'
    };
    return names[platform] || 'Music';
}

// Global functions for media interactions
window.openImageModal = function(imageUrl, imageTitle) {
    // Create and show image modal
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = `
        <div class="image-modal-content">
            <span class="image-modal-close">&times;</span>
            <img src="${imageUrl}" alt="${imageTitle}">
            <div class="image-modal-title">${imageTitle}</div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.style.display = 'block';

    // Close modal events
    modal.querySelector('.image-modal-close').onclick = () => {
        document.body.removeChild(modal);
    };

    modal.onclick = (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };
};

window.playMusicPreview = function(platform, url, title) {
    // Show a brief preview/loading animation
    const playButtons = document.querySelectorAll('.play-button');
    playButtons.forEach(btn => {
        const icon = btn.querySelector('i');
        if (icon) {
            icon.className = 'fas fa-play';
        }
    });

    // Find the clicked button and show loading
    event.currentTarget.querySelector('.play-button i').className = 'fas fa-spinner fa-spin';

    // Brief delay to show loading, then open the music platform
    setTimeout(() => {
        window.open(url, '_blank');
        // Reset the icon
        event.currentTarget.querySelector('.play-button i').className = 'fas fa-external-link-alt';
    }, 500);
};

// Function to display error message
function displayError(message) {
    bioRoot.innerHTML = `<div class="link-placeholder">${message}</div>`;
}

// Check if user has valid premium status (use global enforcement)
function checkPremiumStatus(userData) {
    return window.PremiumEnforcement ?
           window.PremiumEnforcement.checkPremiumStatus(userData) :
           false;
}

// Update user's template to classic when they lose access to premium template
function updateUserTemplateToClassic(userId, templateId) {
    if (window.PremiumEnforcement) {
        window.PremiumEnforcement.revertToClassicTemplate(userId, templateId);
    }
}

// Function to get visitor's location using IP geolocation API
async function getVisitorLocation() {
    try {
        // Use a free IP geolocation API
        const response = await fetch('https://ipapi.co/json/');
        if (!response.ok) {
            throw new Error('Failed to fetch location data');
        }

        const data = await response.json();

        // Extract relevant location data
        return {
            country: data.country_name,
            countryCode: data.country_code,
            region: data.region,
            city: data.city,
            latitude: data.latitude,
            longitude: data.longitude,
            timezone: data.timezone,
            isp: data.org
        };
    } catch (error) {
        console.error("Error getting visitor location:", error);
        // Return a default object with unknown values
        return {
            country: "Unknown",
            countryCode: "XX",
            region: "Unknown",
            city: "Unknown"
        };
    }
}

// Function to track link clicks
function trackLinkClick(linkId, url, userId) {
    // Only track if we have the necessary data
    if (!linkId || !url) return;

    // Skip tracking if in preview mode
    if (!isPreview) {
        // Get location data and record the click
        getVisitorLocation().then(geoData => {
            // Create click data object
            const clickData = {
                linkId: linkId,
                userId: userId,
                url: url,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                referrer: document.referrer || 'direct',
                userAgent: navigator.userAgent,
                geo: geoData
            };

            // Add to clicks collection
            db.collection('clicks').add(clickData)
                .then(() => {
                    console.log("Link click tracked with location data");

                    // Update link click count
                    db.collection('links').doc(linkId).update({
                        clicks: firebase.firestore.FieldValue.increment(1),
                        lastClickedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }).catch(error => {
                        console.error("Error updating link click count:", error);
                    });
                })
                .catch(error => {
                    console.error("Error tracking link click:", error);
                });
        });
    } else {
        console.log("Preview mode detected - skipping link click tracking");
    }

    // Open the URL
    window.open(url, '_blank');
}



// Load user profile when page loads
document.addEventListener('DOMContentLoaded', loadUserProfile);
