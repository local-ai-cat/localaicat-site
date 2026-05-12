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
            '#cookie-consent-banner{position:fixed;bottom:0;left:0;right:0;background:rgba(6,6,6,0.92);backdrop-filter:blur(20px) saturate(1.4);-webkit-backdrop-filter:blur(20px) saturate(1.4);padding:20px 24px;box-shadow:0 -8px 32px rgba(0,0,0,0.5);z-index:1000000;border-top:1px solid rgba(255,255,255,0.07);animation:slideUp 0.35s cubic-bezier(0.4,0,0.2,1);font-family:var(--font-body),ui-sans-serif,system-ui,sans-serif;color:#f0ece4}',
            '@keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}',
            '@keyframes slideDown{from{transform:translateY(0);opacity:1}to{transform:translateY(100%);opacity:0}}',
            '.cookie-banner-content{max-width:1200px;margin:0 auto;display:flex;flex-direction:column;gap:16px;align-items:center;text-align:center}',
            '.cookie-banner-text{color:#f0ece4}',
            '.cookie-banner-text p{margin:0 0 6px 0;font-size:14px;line-height:1.55;color:#b8b0a4}',
            '.cookie-banner-text strong{display:block;font-weight:600;font-size:15px;letter-spacing:-0.01em;color:#f0ece4;margin-bottom:2px}',
            '.cookie-banner-text a{color:#e8d5b0;text-decoration:none;font-size:13px;font-weight:500;border-bottom:1px solid rgba(232,213,176,0.35);transition:border-color 160ms ease,color 160ms ease}',
            '.cookie-banner-text a:hover{color:#f0ece4;border-bottom-color:#f0ece4}',
            '.cookie-banner-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}',
            '.cookie-btn{min-height:44px;padding:0 22px;border-radius:999px;font-family:inherit;font-weight:700;font-size:13px;letter-spacing:0.01em;cursor:pointer;transition:transform 120ms ease,opacity 120ms ease,background 120ms ease,border-color 120ms ease;min-width:112px}',
            '.cookie-btn-accept{background:#f0ece4;color:#060606;border:0}',
            '.cookie-btn-accept:hover{transform:translateY(-1px);opacity:0.92}',
            '.cookie-btn-reject{background:transparent;color:#b8b0a4;border:1px solid rgba(255,255,255,0.15)}',
            '.cookie-btn-reject:hover{color:#f0ece4;border-color:rgba(255,255,255,0.3);background:rgba(255,255,255,0.03)}',
            '@media (min-width:768px){.cookie-banner-content{flex-direction:row;justify-content:space-between;text-align:left;gap:24px}.cookie-banner-text{flex:1;min-width:0}.cookie-banner-text strong{display:inline;margin-right:6px}.cookie-banner-text p:first-child{margin-bottom:4px}.cookie-banner-actions{flex-shrink:0}}',
            '@media (max-width:767px){#cookie-consent-banner{padding:16px}.cookie-banner-text p{font-size:13px}.cookie-btn{padding:0 18px;font-size:12px;min-width:104px;min-height:42px}}',
            '.chat-placeholder{position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;background:#0c0c0b;color:#e8d5b0;font-size:24px;border:1px solid rgba(255,255,255,0.07);box-shadow:0 8px 24px rgba(0,0,0,0.4);cursor:pointer;opacity:0;transform:translateY(20px);transition:opacity 0.3s,transform 0.3s;z-index:999998}',
            '.chat-placeholder.show{opacity:1;transform:translateY(0)}',
            '.chat-placeholder-tooltip{position:fixed;bottom:90px;right:20px;max-width:320px;padding:18px 20px;background:rgba(12,12,11,0.98);color:#f0ece4;font-family:var(--font-body),ui-sans-serif,system-ui,sans-serif;border-radius:14px;border:1px solid rgba(255,255,255,0.07);box-shadow:0 12px 32px rgba(0,0,0,0.5);opacity:0;pointer-events:none;transform:translateY(10px);transition:opacity 0.2s,transform 0.2s;z-index:999999}',
            '.chat-placeholder-tooltip.show{opacity:1;pointer-events:auto;transform:translateY(0)}',
            '.chat-placeholder-tooltip h4{margin:0 0 8px 0;font-family:var(--font-display),serif;font-weight:600;font-size:18px;letter-spacing:-0.02em;color:#f0ece4}',
            '.chat-placeholder-tooltip p{margin:0 0 10px 0;font-size:13px;line-height:1.55;color:#b8b0a4}',
            '.tooltip-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}',
            '.tooltip-actions button{min-height:38px;padding:0 16px;border-radius:999px;border:0;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;transition:transform 120ms ease,opacity 120ms ease}',
            '.tooltip-actions .btn-enable{background:#f0ece4;color:#060606}',
            '.tooltip-actions .btn-enable:hover{transform:translateY(-1px);opacity:0.92}',
            '.tooltip-actions .btn-close{background:transparent;color:#b8b0a4;border:1px solid rgba(255,255,255,0.15)}',
            '.tooltip-actions .btn-close:hover{color:#f0ece4;border-color:rgba(255,255,255,0.3)}'
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
