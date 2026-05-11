// Cookie Consent Management for Local AI Cat
// Handles GDPR-compliant cookie consent for Chatwoot live chat
// Mirrored from atlaslogged.com (same owner, same support inbox)

(function() {
    'use strict';

    const CONSENT_KEY = 'chatwoot-consent';
    const GEO_CACHE_KEY = 'geo-country-check';
    const CHATWOOT_CONFIG = {
        baseUrl: 'https://app.chatwoot.com',
        websiteToken: 'xiyWsj719fc5BZUsg8i4n88i'
    };

    const GDPR_COUNTRIES = [
        'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT',
        'LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE',
        'IS','LI','NO','GB','CH','BR'
    ];

    async function isInGDPRRegion() {
        if (typeof FEATURE_FLAGS === 'undefined' || !FEATURE_FLAGS.enableGeoTargeting) {
            return true;
        }
        const cacheHours = (typeof FEATURE_FLAGS !== 'undefined' && FEATURE_FLAGS.geoCacheHours) ? FEATURE_FLAGS.geoCacheHours : 24;
        const cacheDuration = cacheHours * 60 * 60 * 1000;
        try {
            const cached = sessionStorage.getItem(GEO_CACHE_KEY);
            if (cached) {
                const { countryCode, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < cacheDuration) return GDPR_COUNTRIES.includes(countryCode);
            }
        } catch (e) {}
        try {
            const response = await fetch('https://api.country.is/', { method: 'GET', cache: 'no-cache' });
            if (!response.ok) throw new Error('HTTP ' + response.status);
            const data = await response.json();
            const countryCode = data.country;
            if (!countryCode) throw new Error('No country code');
            try {
                sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ countryCode, timestamp: Date.now() }));
            } catch (e) {}
            return GDPR_COUNTRIES.includes(countryCode);
        } catch (error) {
            return true;
        }
    }

    function getConsentStatus() { return localStorage.getItem(CONSENT_KEY); }
    function saveConsentStatus(status) {
        localStorage.setItem(CONSENT_KEY, status);
        window.dispatchEvent(new CustomEvent('chatwoot-consent-changed', { detail: { consent: status } }));
    }

    function loadChatwoot(autoOpen) {
        window.chatwootSettings = { hideMessageBubble: false, position: 'right', locale: 'en' };
        var BASE_URL = CHATWOOT_CONFIG.baseUrl;
        var g = document.createElement('script');
        var s = document.getElementsByTagName('script')[0];
        g.src = BASE_URL + '/packs/js/sdk.js';
        g.defer = true;
        g.async = true;
        g.onload = function() {
            if (window.chatwootSDK) {
                window.chatwootSDK.run({ websiteToken: CHATWOOT_CONFIG.websiteToken, baseUrl: BASE_URL });
                if (autoOpen) {
                    window.addEventListener('chatwoot:ready', function() {
                        setTimeout(function() { if (window.$chatwoot) window.$chatwoot.toggle('open'); }, 500);
                    });
                    setTimeout(function() { if (window.$chatwoot) window.$chatwoot.toggle('open'); }, 1500);
                }
            }
        };
        s.parentNode.insertBefore(g, s);
    }

    function acceptCookies(autoOpen) {
        saveConsentStatus('accepted');
        hideCookieBanner();
        loadChatwoot(autoOpen);
    }

    function rejectCookies() {
        saveConsentStatus('rejected');
        hideCookieBanner();
        showChatPlaceholder();
    }

    function el(tag, props, children) {
        const node = document.createElement(tag);
        if (props) for (const k in props) {
            if (k === 'className') node.className = props[k];
            else if (k === 'text') node.textContent = props[k];
            else if (k.startsWith('on') && typeof props[k] === 'function') node.addEventListener(k.slice(2).toLowerCase(), props[k]);
            else if (k === 'style') Object.assign(node.style, props[k]);
            else node.setAttribute(k, props[k]);
        }
        if (children) children.forEach(c => c && node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
        return node;
    }

    function showCookieBanner() {
        if (document.getElementById('cookie-consent-banner')) return;

        const banner = el('div', {
            id: 'cookie-consent-banner',
            role: 'dialog',
            'aria-label': 'Cookie consent',
            'aria-live': 'polite'
        }, [
            el('div', { className: 'cookie-banner-content' }, [
                el('div', { className: 'cookie-banner-text' }, [
                    el('p', null, [el('strong', { text: 'We use cookies for customer support' })]),
                    el('p', { text: 'This website uses Chatwoot (a third-party service) for live chat support. Cookies help maintain your chat session across visits without the need for sharing an email address.' }),
                    el('a', { href: '/privacy', rel: 'noopener noreferrer', text: 'View Privacy Policy' })
                ]),
                el('div', { className: 'cookie-banner-actions' }, [
                    el('button', {
                        id: 'cookie-accept',
                        className: 'cookie-btn cookie-btn-accept',
                        'aria-label': 'Accept cookies',
                        text: 'Accept',
                        onclick: function() { acceptCookies(false); }
                    }),
                    el('button', {
                        id: 'cookie-reject',
                        className: 'cookie-btn cookie-btn-reject',
                        'aria-label': 'Reject cookies',
                        text: 'Reject',
                        onclick: rejectCookies
                    })
                ])
            ])
        ]);

        const style = document.createElement('style');
        style.textContent = [
            '#cookie-consent-banner{position:fixed;bottom:0;left:0;right:0;background:rgba(15,15,17,0.98);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);padding:1.5rem;box-shadow:0 -4px 20px rgba(0,0,0,0.4);z-index:1000000;border-top:1px solid rgba(255,255,255,0.1);animation:slideUp 0.3s ease-out}',
            '@keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}',
            '@keyframes slideDown{from{transform:translateY(0);opacity:1}to{transform:translateY(100%);opacity:0}}',
            '.cookie-banner-content{max-width:1200px;margin:0 auto;display:flex;flex-direction:column;gap:1rem;align-items:center;text-align:center}',
            '.cookie-banner-text{color:#fff}',
            '.cookie-banner-text p{margin:0 0 0.5rem 0;font-size:0.95rem;line-height:1.5}',
            '.cookie-banner-text strong{font-weight:600;font-size:1.05rem}',
            '.cookie-banner-text a{color:#60a5fa;text-decoration:underline;font-size:0.9rem;transition:color 0.2s}',
            '.cookie-banner-text a:hover{color:#93c5fd}',
            '.cookie-banner-actions{display:flex;gap:1rem;flex-wrap:wrap;justify-content:center}',
            '.cookie-btn{padding:0.75rem 2rem;border:none;border-radius:8px;font-weight:600;font-size:0.95rem;cursor:pointer;transition:all 0.2s ease;min-width:120px}',
            '.cookie-btn-accept{background:#2563eb;color:white}',
            '.cookie-btn-accept:hover{background:#1d4ed8;transform:translateY(-1px);box-shadow:0 4px 12px rgba(37,99,235,0.4)}',
            '.cookie-btn-reject{background:rgba(255,255,255,0.1);color:white;border:1px solid rgba(255,255,255,0.2)}',
            '.cookie-btn-reject:hover{background:rgba(255,255,255,0.15)}',
            '@media (min-width:768px){.cookie-banner-content{flex-direction:row;justify-content:space-between;text-align:left}.cookie-banner-text{flex:1}.cookie-banner-actions{flex-shrink:0}}',
            '@media (max-width:767px){#cookie-consent-banner{padding:1rem}.cookie-banner-text p{font-size:0.875rem}.cookie-btn{padding:0.65rem 1.5rem;font-size:0.875rem;min-width:100px}}',
            '.chat-placeholder{position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;background:rgba(30,30,35,0.95);color:#fff;font-size:24px;border:1px solid rgba(255,255,255,0.15);box-shadow:0 4px 16px rgba(0,0,0,0.3);cursor:pointer;opacity:0;transform:translateY(20px);transition:opacity 0.3s,transform 0.3s;z-index:999998}',
            '.chat-placeholder.show{opacity:1;transform:translateY(0)}',
            '.chat-placeholder-tooltip{position:fixed;bottom:90px;right:20px;max-width:320px;padding:1rem 1.25rem;background:rgba(20,20,24,0.98);color:#fff;border-radius:12px;border:1px solid rgba(255,255,255,0.1);box-shadow:0 8px 24px rgba(0,0,0,0.4);opacity:0;pointer-events:none;transform:translateY(10px);transition:opacity 0.2s,transform 0.2s;z-index:999999}',
            '.chat-placeholder-tooltip.show{opacity:1;pointer-events:auto;transform:translateY(0)}',
            '.chat-placeholder-tooltip h4{margin:0 0 0.5rem 0;font-size:1rem}',
            '.chat-placeholder-tooltip p{margin:0 0 0.75rem 0;font-size:0.875rem;line-height:1.5;color:rgba(255,255,255,0.85)}',
            '.tooltip-actions{display:flex;gap:0.5rem;flex-wrap:wrap}',
            '.tooltip-actions button{padding:0.5rem 1rem;border-radius:6px;border:none;font-size:0.85rem;font-weight:600;cursor:pointer}',
            '.tooltip-actions .btn-enable{background:#2563eb;color:#fff}',
            '.tooltip-actions .btn-close{background:rgba(255,255,255,0.1);color:#fff}'
        ].join('\n');

        document.head.appendChild(style);
        document.body.appendChild(banner);
    }

    function hideCookieBanner() {
        const banner = document.getElementById('cookie-consent-banner');
        if (banner) {
            banner.style.animation = 'slideDown 0.3s ease-out';
            setTimeout(() => banner.remove(), 300);
        }
    }

    function showChatPlaceholder() {
        if (document.getElementById('chat-placeholder')) {
            document.getElementById('chat-placeholder').classList.add('show');
            return;
        }

        const placeholder = el('button', {
            id: 'chat-placeholder',
            className: 'chat-placeholder show',
            'aria-label': 'Chat disabled - click to enable cookies',
            text: '💬'
        });

        const privacyLink = el('a', { href: '/privacy', rel: 'noopener noreferrer', text: 'View Privacy Policy' });
        privacyLink.style.color = '#60a5fa';
        privacyLink.style.textDecoration = 'underline';

        const btnEnable = el('button', { className: 'btn-enable', text: 'Enable Cookies' });
        const btnClose = el('button', { className: 'btn-close', text: 'Close' });

        const tooltip = el('div', {
            id: 'chat-placeholder-tooltip',
            className: 'chat-placeholder-tooltip'
        }, [
            el('h4', { text: 'Chat Disabled' }),
            el('p', { text: 'To use our live chat support, you need to enable cookies. This allows us to maintain your chat session.' }),
            el('p', { style: { fontSize: '0.85rem', marginBottom: '1rem' } }, [privacyLink]),
            el('div', { className: 'tooltip-actions' }, [btnEnable, btnClose])
        ]);

        document.body.appendChild(placeholder);
        document.body.appendChild(tooltip);

        placeholder.addEventListener('click', function() { tooltip.classList.toggle('show'); });
        btnEnable.addEventListener('click', function() {
            tooltip.classList.remove('show');
            hideChatPlaceholder();
            acceptCookies(false);
        });
        btnClose.addEventListener('click', function() { tooltip.classList.remove('show'); });

        document.addEventListener('click', function(e) {
            if (!placeholder.contains(e.target) && !tooltip.contains(e.target)) {
                tooltip.classList.remove('show');
            }
        });
    }

    function hideChatPlaceholder() {
        const placeholder = document.getElementById('chat-placeholder');
        const tooltip = document.getElementById('chat-placeholder-tooltip');
        if (placeholder) {
            placeholder.classList.remove('show');
            setTimeout(() => placeholder.remove(), 300);
        }
        if (tooltip) {
            tooltip.classList.remove('show');
            setTimeout(() => tooltip.remove(), 300);
        }
    }

    async function init() {
        const urlParams = new URLSearchParams(window.location.search);
        const hasConsentParam = urlParams.get('consent') === 'chat';
        const isAppUserAgent = navigator.userAgent.includes('LocalAICat/') || navigator.userAgent.includes('AtlasLogged/');

        if (hasConsentParam || isAppUserAgent) {
            saveConsentStatus('accepted');
            loadChatwoot(true);
            return;
        }

        const consentStatus = getConsentStatus();
        if (consentStatus === 'accepted') {
            loadChatwoot(false);
        } else if (consentStatus === 'rejected') {
            showChatPlaceholder();
        } else {
            const needsConsent = await isInGDPRRegion();
            if (needsConsent) {
                showCookieBanner();
            } else {
                saveConsentStatus('accepted');
                loadChatwoot(false);
            }
        }
    }

    window.ChatwootConsent = {
        accept: acceptCookies,
        reject: rejectCookies,
        reset: function() { localStorage.removeItem(CONSENT_KEY); location.reload(); },
        getStatus: getConsentStatus,
        clearGeoCache: function() { sessionStorage.removeItem(GEO_CACHE_KEY); },
        checkGeoCache: function() {
            const cached = sessionStorage.getItem(GEO_CACHE_KEY);
            return cached ? JSON.parse(cached) : null;
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
