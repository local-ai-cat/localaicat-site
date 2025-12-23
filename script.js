// ===================================
// Particles Animation
// ===================================
function createParticles() {
    const particlesContainer = document.getElementById('particles');
    const emojis = ['🐾', '✨', '💫', '⭐', '🌟', '💝', '🎯'];
    const particleCount = 15;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 8}s`;
        particle.style.animationDuration = `${8 + Math.random() * 4}s`;
        particlesContainer.appendChild(particle);
    }
}

// ===================================
// Chat Widget Functionality
// ===================================
const chatToggle = document.getElementById('chatToggle');
const chatWidget = document.getElementById('chatWidget');
const closeChat = document.getElementById('closeChat');
const chatInput = document.getElementById('chatInput');
const sendMessage = document.getElementById('sendMessage');
const chatMessages = document.getElementById('chatMessages');
const tryChat = document.getElementById('tryChat');

// Canned responses for demo
const cannedResponses = {
    'hello': 'Meow! 👋 Welcome to Local AI Cat! I\'m your purr-sonal AI assistant. The real app runs completely offline on your device. Try asking me about features!',
    'hi': 'Hi there! 🐱 Great to see you! Want to learn about my features or how I keep your data private?',
    'hey': 'Hey! 😸 Ready to chat? Ask me anything about Local AI Cat!',
    'help': 'I can tell you about:\n\n🔒 Privacy - How we keep your data safe\n⚡ Speed - Why local AI is faster\n🎙️ Voice - Audio transcription features\n📱 Download - Where to get the app\n\nWhat would you like to know?',
    'privacy': 'Privacy is our top priority! 🔒\n\nWith Local AI Cat:\n• Your chats NEVER leave your device\n• No cloud servers\n• No data collection\n• No tracking\n\nYour conversations are truly yours. That\'s the power of local AI!',
    'speed': 'Local AI is lightning fast! ⚡\n\nBecause everything runs on your device:\n• No network delays\n• Instant responses\n• Works offline\n• Powered by Apple Silicon\n\nIt\'s like having your own AI supercomputer in your pocket!',
    'voice': 'Voice features are pawsome! 🎙️\n\nLocal AI Cat includes:\n• Whisper transcription\n• Works completely offline\n• Accurate speech-to-text\n• Menu bar quick access\n\nJust speak naturally and your words appear!',
    'download': 'Ready to get started? 📱\n\nLocal AI Cat is available on:\n• iPhone (iOS 17.0+)\n• iPad (iPadOS 17.0+)\n• Mac (macOS 14.0+)\n\nFind the "Download Free" button on this page or visit the App Store!',
    'features': 'Here are my favorite features! ✨\n\n🔒 100% Private\n⚡ Lightning Fast\n✈️ Works Offline\n🎙️ Voice Transcription\n🧠 Multiple AI Models\n🎨 Custom Personalities\n\nWhich one interests you most?',
    'price': 'Local AI Cat is free to download! 🎉\n\nCore features are completely free:\n• Basic chat\n• Voice transcription\n• Privacy protection\n\nPremium features unlock even more power!',
    'meow': 'Meow meow! 🐱💕 I see you speak my language!',
    'cat': 'Yes, I\'m a cat! 😺 But I\'m also a sophisticated AI assistant. The best of both worlds!',
    'default': 'Interesting! 🤔 While I\'m just a demo right now, the real Local AI Cat can have full conversations about anything you want - completely offline!\n\nTry asking about "help" to see what I can demo!'
};

// Toggle chat widget
function toggleChat() {
    chatWidget.classList.toggle('active');
    if (chatWidget.classList.contains('active')) {
        chatToggle.style.display = 'none';
        chatInput.focus();
    } else {
        chatToggle.style.display = 'flex';
    }
}

chatToggle.addEventListener('click', toggleChat);
tryChat.addEventListener('click', toggleChat);
closeChat.addEventListener('click', toggleChat);

// Add message to chat
function addMessage(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-widget-message ${isUser ? 'user' : 'ai'}`;

    if (!isUser) {
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = '🐱';
        messageDiv.appendChild(avatar);
    }

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = text;
    messageDiv.appendChild(bubble);

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Handle sending message
function handleSendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    // Add user message
    addMessage(message, true);
    chatInput.value = '';

    // Simulate typing delay
    setTimeout(() => {
        const lowerMessage = message.toLowerCase();
        let response = cannedResponses.default;

        // Find matching canned response
        for (const [key, value] of Object.entries(cannedResponses)) {
            if (lowerMessage.includes(key)) {
                response = value;
                break;
            }
        }

        addMessage(response);
    }, 800);
}

sendMessage.addEventListener('click', handleSendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSendMessage();
    }
});

// ===================================
// Smooth Scroll
// ===================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// ===================================
// Scroll Animations
// ===================================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe feature cards
document.querySelectorAll('.feature-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(card);
});

// ===================================
// Nav Background on Scroll
// ===================================
let lastScroll = 0;
const nav = document.querySelector('.nav');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 50) {
        nav.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
    } else {
        nav.style.boxShadow = 'none';
    }

    lastScroll = currentScroll;
});

// ===================================
// Easter Eggs
// ===================================
let clickCount = 0;
const logo = document.querySelector('.logo');

logo.addEventListener('click', (e) => {
    e.preventDefault();
    clickCount++;

    if (clickCount === 5) {
        // Create confetti effect
        const confettiEmojis = ['🎉', '🎊', '🐱', '✨', '💝', '🌟'];
        for (let i = 0; i < 20; i++) {
            const confetti = document.createElement('div');
            confetti.textContent = confettiEmojis[Math.floor(Math.random() * confettiEmojis.length)];
            confetti.style.position = 'fixed';
            confetti.style.left = `${Math.random() * 100}%`;
            confetti.style.top = '-50px';
            confetti.style.fontSize = '2rem';
            confetti.style.pointerEvents = 'none';
            confetti.style.zIndex = '9999';
            confetti.style.animation = 'fall 3s linear forwards';
            document.body.appendChild(confetti);

            setTimeout(() => confetti.remove(), 3000);
        }

        // Add falling animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fall {
                to {
                    transform: translateY(100vh) rotate(360deg);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);

        addMessage('You found the secret! 🎉 You must really love cats! Meow meow! 🐱💕');
        toggleChat();
        clickCount = 0;
    }
});

// ===================================
// Initialize
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    createParticles();

    // Add some personality to console
    console.log('%c🐱 Local AI Cat', 'font-size: 24px; font-weight: bold; color: #FF6B35;');
    console.log('%cMeow! Thanks for checking out our code!', 'font-size: 14px; color: #666;');
    console.log('%cWant to contribute? Visit our GitHub!', 'font-size: 14px; color: #5B21B6;');

    // Animate hero elements on load
    const heroElements = document.querySelectorAll('.hero-badge, .hero-title, .hero-description, .hero-actions, .hero-stats');
    heroElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        setTimeout(() => {
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, 100 * index);
    });
});

// ===================================
// Mobile Menu Toggle (for future use)
// ===================================
// You can add a hamburger menu for mobile if needed
const createMobileMenu = () => {
    // Mobile menu logic here if needed
};

// ===================================
// Analytics Helper (for future use)
// ===================================
// This is structured to easily add analytics later
const trackEvent = (category, action, label) => {
    // Future: Add analytics tracking here
    console.log('Event:', category, action, label);
};

// Track button clicks
document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const text = btn.textContent.trim();
        trackEvent('Button', 'Click', text);
    });
});
